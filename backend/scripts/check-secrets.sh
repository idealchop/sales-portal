#!/usr/bin/env bash
#
# Verify Cloud Functions secrets exist before deploy (salesPortalApi bindings).
#
# Usage:
#   ./scripts/check-secrets.sh
#   ./scripts/check-secrets.sh --try-set   # run set-secrets.sh if secrets.env has values
#
# Env:
#   FIREBASE_PROJECT (default: aquaflow-management-suite)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_ID="${FIREBASE_PROJECT:-aquaflow-management-suite}"
TRY_SET=0

for arg in "$@"; do
  case "$arg" in
    --try-set) TRY_SET=1 ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (use --help)" >&2
      exit 1
      ;;
  esac
done

# Keep in sync with functions/src/config/function-secrets.ts
REQUIRED_SECRETS=(
  "SALES_PORTAL_GEMINI_API_KEY"
  "SMARTREFILL_BREVO_API_KEY"
)

GCLOUD=(gcloud --project="$PROJECT_ID")
MISSING=()

secret_has_version() {
  local secret_id="$1"
  "${GCLOUD[@]}" secrets versions list "$secret_id" \
    --limit=1 \
    --format='value(name)' 2>/dev/null | grep -q .
}

for secret_id in "${REQUIRED_SECRETS[@]}"; do
  if ! "${GCLOUD[@]}" secrets describe "$secret_id" >/dev/null 2>&1; then
    MISSING+=("$secret_id (not created)")
    continue
  fi
  if ! secret_has_version "$secret_id"; then
    MISSING+=("$secret_id (no versions)")
  fi
done

if [[ ${#MISSING[@]} -eq 0 ]]; then
  exit 0
fi

if [[ "$TRY_SET" -eq 1 && -f "${ROOT_DIR}/secrets.env" ]]; then
  echo "Missing secrets — attempting set-secrets.sh from secrets.env..."
  bash "${ROOT_DIR}/scripts/set-secrets.sh"
  MISSING=()
  for secret_id in "${REQUIRED_SECRETS[@]}"; do
    if ! "${GCLOUD[@]}" secrets describe "$secret_id" >/dev/null 2>&1; then
      MISSING+=("$secret_id (not created)")
      continue
    fi
    if ! secret_has_version "$secret_id"; then
      MISSING+=("$secret_id (no versions)")
    fi
  done
  if [[ ${#MISSING[@]} -eq 0 ]]; then
    exit 0
  fi
fi

echo "Deploy blocked: required Secret Manager entries are missing for salesPortalApi." >&2
echo "" >&2
for item in "${MISSING[@]}"; do
  echo "  • ${item}" >&2
done
echo "" >&2
echo "Create the Sales Portal Gemini key (separate from SmartRefill GEMINI_API_KEY):" >&2
echo "" >&2
echo "  cd backend" >&2
echo "  cp secrets.env.example secrets.env" >&2
echo "  # Set SALES_PORTAL_GEMINI_API_KEY=... in secrets.env" >&2
echo "  npm run secrets:set" >&2
echo "" >&2
echo "Or interactively:" >&2
echo "  npx -y firebase-tools functions:secrets:set SALES_PORTAL_GEMINI_API_KEY --project ${PROJECT_ID}" >&2
echo "" >&2
echo "Then rerun: cd backend && ./deploy.sh" >&2
exit 1
