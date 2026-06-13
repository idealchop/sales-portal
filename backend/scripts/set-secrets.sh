#!/usr/bin/env bash
#
# Create / update Secret Manager secrets for Sales Portal (Functions + App Hosting).
#
# Usage:
#   cp secrets.env.example secrets.env   # fill values
#   ./scripts/set-secrets.sh             # upsert secrets
#   ./scripts/set-secrets.sh --dry-run   # print planned actions
#
# Env:
#   SECRETS_ENV   (default: $ROOT_DIR/secrets.env)
#   FIREBASE_PROJECT (overrides secrets.env FIREBASE_PROJECT)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS_ENV="${SECRETS_ENV:-${ROOT_DIR}/secrets.env}"
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (use --help)" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$SECRETS_ENV" ]]; then
  echo "Missing $SECRETS_ENV" >&2
  echo "Copy secrets.env.example → secrets.env and fill in values." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$SECRETS_ENV"
set +a

PROJECT_ID="${FIREBASE_PROJECT:-aquaflow-management-suite}"
GCLOUD=(gcloud --project="$PROJECT_ID")

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Sales Portal secrets — project ${PROJECT_ID}${NC}"

upsert_secret() {
  local secret_id="$1"
  local secret_value="$2"

  if [[ -z "${secret_value// /}" ]]; then
    echo -e "${YELLOW}  skip ${secret_id} (empty in secrets.env)${NC}"
    return 0
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "  [dry-run] upsert secret ${secret_id} (${#secret_value} chars)"
    return 0
  fi

  if "${GCLOUD[@]}" secrets describe "$secret_id" >/dev/null 2>&1; then
    printf '%s' "$secret_value" | "${GCLOUD[@]}" secrets versions add "$secret_id" --data-file=-
    echo -e "${GREEN}  updated ${secret_id}${NC}"
  else
    printf '%s' "$secret_value" | "${GCLOUD[@]}" secrets create "$secret_id" \
      --data-file=- \
      --replication-policy=automatic
    echo -e "${GREEN}  created ${secret_id}${NC}"
  fi
}

set_function_secret() {
  local secret_id="$1"
  local secret_value="$2"

  if [[ -z "${secret_value// /}" ]]; then
    echo -e "${YELLOW}  skip ${secret_id} (empty in secrets.env)${NC}"
    return 0
  fi

  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "  [dry-run] firebase functions:secrets:set ${secret_id} (${#secret_value} chars)"
    return 0
  fi

  printf '%s' "$secret_value" | npx -y firebase-tools functions:secrets:set "$secret_id" \
    --project "$PROJECT_ID" \
    --data-file=-
  echo -e "${GREEN}  set ${secret_id} (Firebase Functions secret + access)${NC}"
}

echo -e "${BLUE}Functions (bound on salesPortalApi via secrets: [...])${NC}"
set_function_secret "SALES_PORTAL_GEMINI_API_KEY" "${SALES_PORTAL_GEMINI_API_KEY:-}"

echo -e "${BLUE}App Hosting (referenced in frontend/apphosting.yaml)${NC}"
if [[ -n "${SALES_PORTAL_APPCHECK_DEBUG_TOKEN:-}" ]]; then
  upsert_secret "sales-portal-appcheck-debug-token" "$SALES_PORTAL_APPCHECK_DEBUG_TOKEN"
else
  echo -e "${YELLOW}  skip sales-portal-appcheck-debug-token (empty)${NC}"
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo -e "${BLUE}Dry run complete.${NC}"
  exit 0
fi

echo ""
echo -e "${GREEN}Secrets upserted.${NC}"
echo "Redeploy so bindings take effect:"
echo "  cd backend && ./deploy.sh"
echo ""
echo "App Hosting: grant new secrets to your backend if needed:"
echo "  npx -y firebase-tools apphosting:secrets:grantaccess sales-portal-appcheck-debug-token --backend <BACKEND_ID> --project ${PROJECT_ID}"
