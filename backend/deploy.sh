#!/usr/bin/env bash

# Sales Portal API — build, test (unit + integration + BDD), lint, deploy.
# Deploys: sales-portal-api Cloud Functions (Express gateway on asia-southeast1).
#
# ENV=prod (default): salesPortalApi + eventsTrainingPromotionDelivery (+ optional Firestore).
# ENV=dev: deploys only salesPortalApiDev (+ optional *Dev job) and optional riverdb-dev rules.
#   DEPLOY_DEV_JOBS=1 — also deploy eventsTrainingPromotionDeliveryDev (gated by SALES_PORTAL_DEV_JOBS_ENABLED).
#
# Default: functions only (shared riverdb with SmartRefill — rules deploy is opt-in).
# Optional: DEPLOY_FIRESTORE=1 to include firestore:rules + firestore:indexes from this repo.
# Optional: DEPLOY_STORAGE_RULES=1 to deploy storage.rules (requires Firebase Storage on the project).
# BDD: seeds emulator baseline then runs Playwright API specs against salesPortalApi.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_DIR="${ROOT_DIR}/functions"
PROJECT_ID="aquaflow-management-suite"
DEPLOY_ENV="${ENV:-prod}"
FIREBASE_CONFIG="${ROOT_DIR}/firebase.json"
DEV_JOBS_EXPORTS="${FUNCTIONS_DIR}/src/dev/dev-jobs-exports.ts"
DEV_JOBS_EXPORTS_ENABLED="${FUNCTIONS_DIR}/src/dev/dev-jobs-exports.enabled.ts"
DEV_JOBS_EXPORTS_BAK=""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [[ "${DEPLOY_ENV}" != "prod" && "${DEPLOY_ENV}" != "dev" ]]; then
  echo -e "${RED}❌ ENV must be prod or dev (got: ${DEPLOY_ENV})${NC}"
  exit 1
fi

echo -e "${BLUE}🚀 Starting compilation and deployment for Sales Portal API... (ENV=${DEPLOY_ENV})${NC}"

restore_dev_jobs_exports() {
  if [[ -n "${DEV_JOBS_EXPORTS_BAK}" && -f "${DEV_JOBS_EXPORTS_BAK}" ]]; then
    mv "${DEV_JOBS_EXPORTS_BAK}" "${DEV_JOBS_EXPORTS}"
    DEV_JOBS_EXPORTS_BAK=""
  fi
}

if [[ "${DEPLOY_ENV}" == "dev" && "${DEPLOY_DEV_JOBS:-0}" == "1" ]]; then
  echo -e "${YELLOW}   Enabling Dev job exports (DEPLOY_DEV_JOBS=1)...${NC}"
  DEV_JOBS_EXPORTS_BAK="${DEV_JOBS_EXPORTS}.deploy-bak-$$"
  cp "${DEV_JOBS_EXPORTS}" "${DEV_JOBS_EXPORTS_BAK}"
  cp "${DEV_JOBS_EXPORTS_ENABLED}" "${DEV_JOBS_EXPORTS}"
fi

cd "${ROOT_DIR}"

echo -e "${BLUE}📋 Syncing Firestore + Storage rules from smartrefill/frontend (canonical)...${NC}"
npm run sync:firestore

echo -e "${BLUE}🔎 Verifying Firestore + Storage config matches smartrefill + sales-portal copies...${NC}"
npm run check:firestore

cd "${FUNCTIONS_DIR}"

if [[ ! -d node_modules ]]; then
  echo -e "${BLUE}📦 Installing functions dependencies...${NC}"
  npm install
fi

echo -e "${BLUE}🏗️ Compiling TypeScript...${NC}"
npm run build

echo -e "${BLUE}🧪 Running unit tests...${NC}"
npm run test:unit

echo -e "${BLUE}🔗 Running integration tests...${NC}"
npm run test:integration

echo -e "${BLUE}🎭 Running BDD tests (Playwright + emulators)...${NC}"
cd "${ROOT_DIR}"
npx -y firebase-tools emulators:exec \
  --project "${PROJECT_ID}" \
  --only "functions,firestore,auth" \
  "node seed-emulator.js && cd functions && npm run test:bdd"

cd "${FUNCTIONS_DIR}"

echo -e "${BLUE}🔍 Running linter...${NC}"
npm run lint -- --fix

cd "${ROOT_DIR}"

trap restore_dev_jobs_exports EXIT

echo -e "${BLUE}🔐 Checking required Cloud Functions secrets...${NC}"
bash "${ROOT_DIR}/scripts/check-secrets.sh" --try-set

if [[ "${DEPLOY_ENV}" == "dev" ]]; then
  FIREBASE_CONFIG="${ROOT_DIR}/firebase.dev.json"
  # Codebase-qualified filters (firebase-tools requires sales-portal-api:<name>)
  DEV_ONLY="functions:sales-portal-api:salesPortalApiDev"
  if [[ "${DEPLOY_DEV_JOBS:-0}" == "1" ]]; then
    DEV_ONLY="${DEV_ONLY},functions:sales-portal-api:eventsTrainingPromotionDeliveryDev"
    echo -e "${BLUE}🔥 Deploying Dev Cloud Functions (API + jobs) → riverdb-dev...${NC}"
  else
    echo -e "${BLUE}🔥 Deploying Dev Cloud Functions (API only) → riverdb-dev...${NC}"
    echo -e "${YELLOW}   Tip: DEPLOY_DEV_JOBS=1 to also deploy eventsTrainingPromotionDeliveryDev.${NC}"
  fi
  DEPLOY_TARGETS="${DEV_ONLY}"
  if [[ "${DEPLOY_FIRESTORE:-0}" == "1" ]]; then
    echo -e "${BLUE}🔥 Including Firestore rules/indexes → riverdb-dev.${NC}"
    DEPLOY_TARGETS="${DEPLOY_TARGETS},firestore:rules,firestore:indexes"
  else
    echo -e "${BLUE}ℹ️  Skipping Firestore deploy (functions only).${NC}"
    echo -e "${BLUE}   Set DEPLOY_FIRESTORE=1 to deploy rules/indexes to riverdb-dev.${NC}"
  fi
  echo -e "${BLUE}🔥 Deploying: ${DEPLOY_TARGETS}${NC}"
  npx -y firebase-tools deploy --project "${PROJECT_ID}" \
    --config "${FIREBASE_CONFIG}" \
    --only "${DEPLOY_TARGETS}"
else
  DEPLOY_TARGETS="functions:sales-portal-api"
  if [[ "${DEPLOY_FIRESTORE:-0}" == "1" ]]; then
    echo -e "${BLUE}🔥 Including Firestore rules/indexes (canonical: smartrefill/frontend).${NC}"
    DEPLOY_TARGETS="${DEPLOY_TARGETS},firestore:rules,firestore:indexes"
  else
    echo -e "${BLUE}ℹ️  Skipping Firestore deploy (functions only).${NC}"
    echo -e "${BLUE}   Set DEPLOY_FIRESTORE=1 to deploy rules/indexes (same files as SmartRefill).${NC}"
  fi
  echo -e "${BLUE}🔥 Deploying: ${DEPLOY_TARGETS}${NC}"
  npx -y firebase-tools deploy --project "${PROJECT_ID}" --only "${DEPLOY_TARGETS}"
fi

if [[ "${DEPLOY_ENV}" == "prod" && "${DEPLOY_STORAGE_RULES:-0}" == "1" ]]; then
  echo -e "${BLUE}🔥 Deploying production Storage rules...${NC}"
  set +e
  npx -y firebase-tools deploy --project "${PROJECT_ID}" --only storage
  STORAGE_DEPLOY_EXIT=$?
  set -e
  if [[ "${STORAGE_DEPLOY_EXIT}" -ne 0 ]]; then
    echo -e "${BLUE}⚠️  Storage rules were not deployed.${NC}"
    echo -e "${BLUE}   Enable Firebase Storage for ${PROJECT_ID} first:${NC}"
    echo -e "${BLUE}   https://console.firebase.google.com/project/${PROJECT_ID}/storage${NC}"
    exit "${STORAGE_DEPLOY_EXIT}"
  fi
elif [[ "${DEPLOY_ENV}" == "prod" ]]; then
  echo -e "${BLUE}ℹ️  Skipping Storage rules.${NC}"
  echo -e "${BLUE}   Set DEPLOY_STORAGE_RULES=1 after enabling Storage on the project.${NC}"
fi

echo -e "${GREEN}✅ Deployment successful!${NC}"
if [[ "${DEPLOY_ENV}" == "dev" ]]; then
  echo -e "${GREEN}   • salesPortalApiDev → riverdb-dev (legacy analytics → prod-smartrefill)${NC}"
  echo -e "${GREEN}   • SMARTREFILL_API_URL → smartrefillV3ApiDev${NC}"
  if [[ "${DEPLOY_DEV_JOBS:-0}" == "1" ]]; then
    echo -e "${GREEN}   • eventsTrainingPromotionDeliveryDev (SALES_PORTAL_DEV_JOBS_ENABLED=true)${NC}"
  fi
  if [[ "${DEPLOY_FIRESTORE:-0}" == "1" ]]; then
    echo -e "${GREEN}   • firestore:rules, firestore:indexes (riverdb-dev)${NC}"
  fi
else
  echo -e "${GREEN}   • functions:sales-portal-api (salesPortalApi + eventsTrainingPromotionDelivery, asia-southeast1)${NC}"
  if [[ "${DEPLOY_FIRESTORE:-0}" == "1" ]]; then
    echo -e "${GREEN}   • firestore:rules, firestore:indexes, storage.rules (riverdb + smartrefill-singapore)${NC}"
  fi
  if [[ "${DEPLOY_STORAGE_RULES:-0}" == "1" ]]; then
    echo -e "${GREEN}   • storage rules${NC}"
  fi
fi
