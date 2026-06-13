#!/usr/bin/env bash
# Copy canonical Firestore + Storage rules from smartrefill/frontend → sales-portal/backend.
# Canonical source: smartrefill/frontend/firestore.rules, firestore.indexes.json, storage.rules
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CANONICAL="$(cd "$ROOT/../../smartrefill/frontend" && pwd)"

if [[ ! -f "$CANONICAL/firestore.rules" ]]; then
  echo "Error: canonical Firestore config not found at $CANONICAL"
  echo "Expected sibling repo: river/smartrefill/frontend/"
  exit 1
fi

if [[ ! -f "$CANONICAL/storage.rules" ]]; then
  echo "Error: canonical Storage rules not found at $CANONICAL/storage.rules"
  exit 1
fi

cp "$CANONICAL/firestore.rules" "$ROOT/firestore.rules"
cp "$CANONICAL/firestore.indexes.json" "$ROOT/firestore.indexes.json"
cp "$CANONICAL/storage.rules" "$ROOT/storage.rules"
echo "Synced Firestore + Storage config from smartrefill/frontend/ to sales-portal/backend/"
