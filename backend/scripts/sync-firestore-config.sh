#!/usr/bin/env bash
# Copy canonical Firestore rules/indexes from smartrefill/frontend → sales-portal/backend.
# Canonical source: smartrefill/frontend/firestore.rules, firestore.indexes.json
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANONICAL="$(cd "$ROOT/../../smartrefill/frontend" && pwd)"

if [[ ! -f "$CANONICAL/firestore.rules" ]]; then
  echo "Error: canonical Firestore config not found at $CANONICAL"
  echo "Expected sibling repo: river/smartrefill/frontend/"
  exit 1
fi

cp "$CANONICAL/firestore.rules" "$ROOT/firestore.rules"
cp "$CANONICAL/firestore.indexes.json" "$ROOT/firestore.indexes.json"
echo "Synced Firestore config from smartrefill/frontend/ to sales-portal/backend/"
