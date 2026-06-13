#!/usr/bin/env bash
# Sales Portal local BDD: Firebase emulators + API Playwright, then frontend UI Playwright.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
FUNCTIONS_DIR="${BACKEND_DIR}/functions"
PROJECT_ID="${FIREBASE_PROJECT:-aquaflow-management-suite}"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${BLUE}$*${NC}"; }
ok() { echo -e "${GREEN}$*${NC}"; }
fail() { echo -e "${RED}$*${NC}"; exit 1; }

ensure_deps() {
  local dir="$1"
  if [[ ! -d "${dir}/node_modules" ]]; then
    log "Installing dependencies in ${dir}..."
    npm --prefix "${dir}" install
  fi
}

log "Sales Portal local BDD (${PROJECT_ID})"

ensure_deps "${FUNCTIONS_DIR}"
ensure_deps "${BACKEND_DIR}"
ensure_deps "${FRONTEND_DIR}"

log "Building API..."
npm --prefix "${FUNCTIONS_DIR}" run build

log "Backend BDD (emulators + seed + Playwright API specs)..."
cd "${BACKEND_DIR}"
if ! npx -y firebase-tools emulators:exec \
  --project "${PROJECT_ID}" \
  --only "functions,firestore,auth" \
  "node seed-emulator.js && cd functions && npm run test:bdd"; then
  fail "Backend BDD failed"
fi
ok "Backend BDD passed"

log "Installing Playwright Chromium for frontend BDD..."
npm --prefix "${FRONTEND_DIR}" run test:bdd:install

FE_PORT="${PLAYWRIGHT_PORT:-9002}"
log "Frontend Playwright BDD (port ${FE_PORT})..."
if ! (
  cd "${FRONTEND_DIR}"
  PLAYWRIGHT_PORT="${FE_PORT}" PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:bdd
); then
  fail "Frontend BDD failed — ensure dev server is running: npm run dev:frontend"
fi
ok "Frontend BDD passed"

ok "All local BDD suites passed"
