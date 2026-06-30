#!/usr/bin/env bash

# Sales Portal frontend — test, lint, build, stage changes (git add).
# Does not commit, push, or deploy. Stops on the first failing step (set -e).
#
# After commit + push, deploy App Hosting + Hosting CDN:
#   npx -y firebase-tools apphosting:rollouts:create sales-portal \
#     --project aquaflow-management-suite --git-branch sales-portal --force
#   npm run deploy:hosting   # from repo root

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${ROOT_DIR}/.." && pwd)"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [[ "${NODE_MAJOR}" -ge 26 ]]; then
  echo -e "${RED}❌ Node $(node -v) is unsupported for Vitest/Next deploy checks.${NC}"
  echo -e "${YELLOW}   Use Node 22 LTS: nvm install 22 && nvm use 22${NC}"
  exit 1
fi

echo -e "${BLUE}🚀 Sales Portal frontend deploy prep (Node $(node -v))${NC}"

cd "${ROOT_DIR}"

if [[ ! -d node_modules ]]; then
  echo -e "${BLUE}📦 Installing dependencies...${NC}"
  npm install
fi

if ! git -C "${REPO_ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${RED}❌ Not a git repository — run from the sales-portal monorepo.${NC}"
  exit 1
fi

echo -e "${BLUE}🧪 Running unit tests...${NC}"
npm run test:unit

echo -e "${BLUE}🔍 Running linter (eslint --fix)...${NC}"
npm run lint -- --fix

echo -e "${BLUE}🏗️  Building production bundle...${NC}"
npm run build

STAGED_DENY_PATTERN='(^|/)\.env(\.|$)|(^|/)node_modules/|(^|/)\.next/|(^|/)out/|(^|/)test-results/|(^|/)playwright-report/|(^|/)blob-report/|(^|/)coverage/|\.pem$|(^|/)credentials\.json|secret\.local|firebase-debug|(^|/)\.firebase/'

verify_staged_paths() {
  local staged
  staged="$(git -C "${REPO_ROOT}" diff --cached --name-only)"
  if [[ -z "${staged}" ]]; then
    return 0
  fi
  local blocked
  blocked="$(echo "${staged}" | grep -E "${STAGED_DENY_PATTERN}" || true)"
  if [[ -n "${blocked}" ]]; then
    echo -e "${RED}❌ Refusing to stage sensitive or gitignored paths:${NC}"
    echo "${blocked}"
    git -C "${REPO_ROOT}" reset HEAD
    exit 1
  fi
}

echo -e "${BLUE}📂 Staging changes (git add — respects .gitignore)...${NC}"
git -C "${REPO_ROOT}" add -A -- .

verify_staged_paths

echo -e "${GREEN}✅ Frontend deploy prep complete.${NC}"
echo -e "${GREEN}   Staged files:${NC}"
git -C "${REPO_ROOT}" diff --cached --stat

if [[ -n "$(git -C "${REPO_ROOT}" diff --cached --name-only)" ]]; then
  echo -e "${YELLOW}   Review with: git diff --cached${NC}"
  echo -e "${YELLOW}   Commit when ready: git commit -m \"…\"${NC}"
else
  echo -e "${BLUE}   No changes to stage (working tree clean after checks).${NC}"
fi
