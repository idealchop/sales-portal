#!/usr/bin/env bash
# Sales Portal quality gate — run before merge to dev.
# Used by sales-portal-code-review-agent.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

step() {
  echo -e "${BLUE}▶ $1${NC}"
}

pass() {
  echo -e "${GREEN}✓ $1${NC}"
}

fail() {
  echo -e "${RED}✗ $1${NC}" >&2
  exit 1
}

step "Lint (frontend)"
npm run lint --prefix frontend || fail "Frontend ESLint failed"

step "Lint (backend)"
npm run lint --prefix backend/functions || fail "Backend ESLint failed"

step "Build (backend)"
npm run build --prefix backend/functions || fail "Backend build failed"

step "Unit tests (backend)"
npm run test:unit --prefix backend/functions || fail "Backend unit tests failed"

step "Unit tests (frontend)"
npm run test:unit --prefix frontend || fail "Frontend unit tests failed"

step "npm audit (frontend) — high/critical"
(
  cd frontend
  npm audit --audit-level=high
) || fail "Frontend npm audit reported high/critical vulnerabilities"

step "npm audit (backend/functions) — high/critical"
(
  cd backend/functions
  npm audit --audit-level=high
) || fail "Backend npm audit reported high/critical vulnerabilities"

pass "All quality gate checks passed"
