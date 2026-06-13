#!/usr/bin/env bash
# Verify firestore.rules, firestore.indexes.json, and storage.rules match across repos.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANONICAL="$(cd "$ROOT/../../smartrefill/frontend" && pwd)"
SMARTREFILL_BACKEND="$(cd "$ROOT/../../smartrefill/backend" && pwd)"

if [[ ! -f "$CANONICAL/firestore.rules" ]]; then
  echo "Error: canonical Firestore config not found at $CANONICAL"
  exit 1
fi

if [[ ! -f "$CANONICAL/storage.rules" ]]; then
  echo "Error: canonical Storage rules not found at $CANONICAL/storage.rules"
  exit 1
fi

OUT_OF_SYNC=0

check_file() {
  local name="$1"
  local canonical="$CANONICAL/$name"
  shift
  for target in "$@"; do
    if [[ ! -f "$target" ]]; then
      echo "MISSING: $target"
      OUT_OF_SYNC=1
      continue
    fi
    if ! diff -q "$canonical" "$target" >/dev/null 2>&1; then
      echo "OUT OF SYNC: $target (differs from $canonical)"
      OUT_OF_SYNC=1
    fi
  done
}

check_file "firestore.rules" \
  "$SMARTREFILL_BACKEND/firestore.rules" \
  "$ROOT/firestore.rules"

check_file "firestore.indexes.json" \
  "$SMARTREFILL_BACKEND/firestore.indexes.json" \
  "$ROOT/firestore.indexes.json"

check_file "storage.rules" \
  "$SMARTREFILL_BACKEND/storage.rules" \
  "$ROOT/storage.rules"

if [[ "$OUT_OF_SYNC" -ne 0 ]]; then
  echo ""
  echo "Fix:"
  echo "  cd smartrefill/backend && npm run sync:firestore"
  echo "  cd sales-portal/backend && npm run sync:firestore"
  exit 1
fi

echo "Firestore + Storage config in sync (smartrefill/frontend → smartrefill/backend + sales-portal/backend)."
