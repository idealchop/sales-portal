#!/usr/bin/env bash
# Start Sales Portal local dev: Next.js frontend + Express API (live Firestore).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
FUNCTIONS_DIR="${ROOT_DIR}/backend/functions"
API_PORT="${SALES_PORTAL_API_PORT:-8071}"
FE_PORT="${LOCAL_FE_PORT:-9002}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}$*${NC}"; }
ok() { echo -e "${GREEN}$*${NC}"; }
warn() { echo -e "${YELLOW}$*${NC}"; }

API_PID=""
FE_PID=""

cleanup() {
  local code=$?
  if [[ -n "${API_PID}" ]]; then
    kill "${API_PID}" 2>/dev/null || true
  fi
  if [[ -n "${FE_PID}" ]]; then
    kill "${FE_PID}" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "${code}"
}

trap cleanup EXIT INT TERM

ensure_deps() {
  local dir="$1"
  if [[ ! -d "${dir}/node_modules" ]]; then
    log "Installing dependencies in ${dir}..."
    npm --prefix "${dir}" install
  fi
}

if [[ ! -f "${FUNCTIONS_DIR}/.env" ]]; then
  warn "⚠️  ${FUNCTIONS_DIR}/.env not found — copy from env examples and set SALES_PORTAL_FIREBASE_* credentials."
fi

if [[ ! -f "${FRONTEND_DIR}/.env.local" ]]; then
  warn "⚠️  ${FRONTEND_DIR}/.env.local not found — copy frontend/.env.example to .env.local."
fi

log "🚀 Sales Portal local dev"
log "   API:      http://localhost:${API_PORT}  (backend/functions → npm run serve:local)"
log "   Frontend: http://localhost:${FE_PORT}  (frontend → npm run dev)"

ensure_deps "${FUNCTIONS_DIR}"
ensure_deps "${FRONTEND_DIR}"

log "📡 Starting local API on port ${API_PORT}..."
SALES_PORTAL_API_PORT="${API_PORT}" npm --prefix "${FUNCTIONS_DIR}" run serve:local &
API_PID=$!

for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    ok "✅ API ready at http://localhost:${API_PORT}"
    break
  fi
  if ! kill -0 "${API_PID}" 2>/dev/null; then
    echo "Local API exited before becoming ready. Check ${FUNCTIONS_DIR}/.env and logs above." >&2
    exit 1
  fi
  sleep 1
done

if ! curl -sf "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
  warn "⚠️  API health check timed out — starting frontend anyway."
fi

log "🌐 Starting Next.js dev server..."
npm --prefix "${FRONTEND_DIR}" run dev -- -p "${FE_PORT}" &
FE_PID=$!

ok "Press Ctrl+C to stop both servers."

wait "${API_PID}" "${FE_PID}"
