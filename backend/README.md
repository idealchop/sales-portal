# Sales Portal backend

Firebase project wrapper for **`salesPortalApi`** (Cloud Functions) and Firestore config copies.

## Structure

```text
backend/
├── firebase.json           # Functions + emulator + env vars
├── firestore.rules         # Synced from smartrefill/frontend (canonical)
├── storage.rules           # Synced from smartrefill/frontend (canonical)
├── deploy.sh               # Build, test, lint, deploy pipeline
├── secrets.env.example     # Secret Manager template
├── scripts/
│   ├── set-secrets.sh
│   ├── check-secrets.sh
│   ├── sync-firestore-config.sh
│   └── check-firestore-sync.sh
└── functions/              # salesPortalApi source
```

## Commands

```bash
# Firestore sync
npm run sync:firestore
npm run check:firestore

# Secrets
cp secrets.env.example secrets.env
npm run secrets:set
npm run check:secrets

# Deploy (from this directory)
./deploy.sh

# Local BDD (emulators + Playwright)
npm run test:bdd:local
```

## Local API

```bash
cd functions
cp .env.example .env
npm run serve:local    # http://127.0.0.1:8071
```

## Documentation

- [docs/backend-documentation.md](../docs/backend-documentation.md)
- [docs/testing-guide.md](../docs/testing-guide.md)
- [functions/src/__tests__/README.md](./functions/src/__tests__/README.md)

## Firestore & Storage

Canonical rules: **`smartrefill/frontend/firestore.rules`**, **`smartrefill/frontend/storage.rules`**

After editing canonical files:

```bash
cd smartrefill/backend && npm run sync:firestore
cd sales-portal/backend && npm run sync:firestore
npm run check:firestore
```

Deploy rules (either repo after sync):

```bash
# Firestore
cd smartrefill/frontend
npx -y firebase-tools deploy --only firestore:rules,firestore:indexes --project aquaflow-management-suite

# Storage (when enabled)
DEPLOY_STORAGE_RULES=1 ./deploy.sh   # from smartrefill/backend or sales-portal/backend
```

Sales Portal path reference: `storage.sales-portal.rules` (comments only).
