#!/usr/bin/env bash

# Sales Portal API — build, test (unit + integration + BDD), lint, deploy.
# Deploys: sales-portal-api Cloud Functions (Express gateway on asia-southeast1).
# Default: functions only (shared riverdb with SmartRefill — rules deploy is opt-in).
# Optional: DEPLOY_FIRESTORE=1 to include firestore:rules + firestore:indexes from this repo.
# Optional: DEPLOY_STORAGE_RULES=1 to deploy storage.rules (requires Firebase Storage on the project).
# BDD: seeds emulator baseline then runs Playwright API specs against salesPortalApi.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FUNCTIONS_DIR="${ROOT_DIR}/functions"
PROJECT_ID="aquaflow-management-suite"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting compilation and deployment for Sales Portal API...${NC}"

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

DEPLOY_TARGETS="functions:sales-portal-api"

if [[ "${DEPLOY_FIRESTORE:-0}" == "1" ]]; then
  echo -e "${BLUE}🔥 Including Firestore rules/indexes (canonical: smartrefill/frontend).${NC}"
  DEPLOY_TARGETS="${DEPLOY_TARGETS},firestore:rules,firestore:indexes"
else
  echo -e "${BLUE}ℹ️  Skipping Firestore deploy (functions only).${NC}"
  echo -e "${BLUE}   Set DEPLOY_FIRESTORE=1 to deploy rules/indexes (same files as SmartRefill).${NC}"
fi

echo -e "${BLUE}🔐 Checking required Cloud Functions secrets...${NC}"
bash "${ROOT_DIR}/scripts/check-secrets.sh" --try-set

echo -e "${BLUE}🔥 Deploying: ${DEPLOY_TARGETS}${NC}"
npx -y firebase-tools deploy --project "${PROJECT_ID}" --only "${DEPLOY_TARGETS}"

if [[ "${DEPLOY_STORAGE_RULES:-0}" == "1" ]]; then
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
else
  echo -e "${BLUE}ℹ️  Skipping Storage rules.${NC}"
  echo -e "${BLUE}   Set DEPLOY_STORAGE_RULES=1 after enabling Storage on the project.${NC}"
fi

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}   • functions:sales-portal-api (salesPortalApi + eventsTrainingPromotionDelivery, asia-southeast1)${NC}"
if [[ "${DEPLOY_FIRESTORE:-0}" == "1" ]]; then
  echo -e "${GREEN}   • firestore:rules, firestore:indexes, storage.rules (riverdb + smartrefill-singapore)${NC}"
fi
if [[ "${DEPLOY_STORAGE_RULES:-0}" == "1" ]]; then
  echo -e "${GREEN}   • storage rules${NC}"
fi
