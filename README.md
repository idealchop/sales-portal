# Smart Refill Sales Portal (v2)

Monorepo with a **separate backend API** and **Next.js frontend**, integrated with the shared SmartRefill platform (`aquaflow-management-suite` / `riverdb`).

**Documentation index:** [`docs/README.md`](docs/README.md) · **Agent guide:** [`AGENTS.md`](AGENTS.md)

## Structure

```
sales-portal/
├── backend/                 # Firebase Cloud Functions API
│   ├── firebase.json
│   ├── firestore.rules
│   └── functions/           # salesPortalApi Express gateway
├── frontend/                # Next.js 16 App Router
└── ../sales-portal-backup/  # Full backup of the legacy single-app repo
```

## Backend (`salesPortalApi`)

Cloud Functions API in `asia-southeast1`:

| Route | Description |
|-------|-------------|
| `GET /health` | Health check |
| `GET /auth/status` | Validates Firebase Auth + `users.appAccess` (`sales-portal` + role) |
| `GET /dashboard/analytics` | Platform analytics via Admin SDK |
| `POST /dashboard/subscriptions/.../approve` | Subscription approval |
| `POST /content-studio/generate` | AI social post generation |
| `GET/POST /onboarding/*` | Onboarding flows |
| `GET/PUT/DELETE /admin/*` | Admin users, data management, catalog |
| `ALL /smartrefill/*` | Proxies to SmartRefill V3 API with the caller's ID token |

Full route catalog: [`docs/backend-documentation.md`](docs/backend-documentation.md)

### Local API

```bash
cd backend/functions
cp .env.example .env
npm install
npm run serve:local   # http://127.0.0.1:8071
```

## Frontend

Next.js 16 · React 19 · Tailwind CSS 4 · Firebase Auth client SDK.

Login flow:

1. Firebase `signInWithEmailAndPassword`
2. `GET /auth/status` on Sales Portal API (double-checks Auth + riverdb `users.appAccess`)
3. Redirect to dashboard or onboarding

### Local frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev -- -p 9002
```

Or from repo root:

```bash
npm run dev:frontend
npm run dev:api
```

## Environment

- **Frontend (local)**: `frontend/.env.local` — Firebase client config + API URLs
- **Backend (local)**: `backend/functions/.env` — Admin SDK credentials + SmartRefill API URL
- **Production secrets**: Google Cloud Secret Manager — see [Secrets](#secrets) below

## Secrets

Production uses **Secret Manager** (same GCP project as SmartRefill: `aquaflow-management-suite`).

| Secret | Used by | Notes |
|--------|---------|-------|
| `SALES_PORTAL_GEMINI_API_KEY` | `salesPortalApi` Cloud Function | Separate from SmartRefill `GEMINI_API_KEY`; Content Studio + AI features |
| `sales-portal-appcheck-debug-token` | App Hosting (`frontend/apphosting.yaml`) | Optional; only if you need a debug token in hosted builds |

Non-secret runtime config for the API is in `backend/firebase.json` → `environmentVariables` (Firestore DB, SmartRefill API URL, storage bucket).

### One-time setup

```bash
cd backend
cp secrets.env.example secrets.env   # fill SALES_PORTAL_GEMINI_API_KEY (and optional App Check token)
npm run secrets:dry-run              # preview
npm run secrets:set                  # upsert to Secret Manager (requires gcloud auth)
cd backend && ./deploy.sh            # redeploy so salesPortalApi binds secrets
```

Alternatively, set the key via Firebase CLI (no global install — uses npx):

```bash
npx -y firebase-tools functions:secrets:set SALES_PORTAL_GEMINI_API_KEY --project aquaflow-management-suite
```

### App Hosting

`frontend/apphosting.yaml` defines public env vars and references `sales-portal-appcheck-debug-token` from Secret Manager. After creating that secret:

```bash
npx -y firebase-tools apphosting:secrets:grantaccess sales-portal-appcheck-debug-token \
  --backend <BACKEND_ID> --project aquaflow-management-suite
```

Local dev does **not** use Secret Manager — keep using `.env` / `.env.local`.

## Testing

Three-layer QA protocol (unit → integration → BDD). See [`docs/testing-guide.md`](docs/testing-guide.md).

```bash
npm run test:unit              # Vitest — frontend + backend
npm run test:unit:backend
npm run test:unit:frontend
npm run test:bdd:local         # emulators + Playwright (API + UI)
npm run test:all:local         # unit + BDD
```

Manual QA: [`docs/frontend-test-cases.md`](docs/frontend-test-cases.md)

## Firestore rules (`riverdb`)

Sales Portal and SmartRefill share **`riverdb`**. The **canonical** rules and indexes are:

**`smartrefill/frontend/firestore.rules`** and **`smartrefill/frontend/firestore.indexes.json`**

(merged SmartRefill V3 + Sales Portal blocks).

Keep copies in sync:

```bash
# After editing canonical files in smartrefill/frontend/
cd smartrefill/backend && npm run sync:firestore
cd sales-portal/backend && npm run sync:firestore
cd sales-portal/backend && npm run check:firestore
```

Deploy Firestore (either repo after sync — same files):

```bash
cd smartrefill/frontend && firebase deploy --only firestore:rules,firestore:indexes
```

Sales Portal `./deploy.sh` runs sync + check automatically; use `DEPLOY_FIRESTORE=1` to include rules in that deploy.

Local emulators:

```bash
cd backend && firebase emulators:start --only firestore
```

Reference snippet (Sales Portal–only paths): `backend/firestore.sales-portal.rules`.

## Deploy

```bash
cd backend/functions
npm run build
npm run deploy
```

Deploy **functions only** from sales-portal (`npm run deploy` does not include Firestore rules unless
you explicitly run `firebase deploy --only firestore:rules`).

Frontend: deploy `frontend/` via Firebase App Hosting or your preferred Next.js host.

## Legacy backup

The previous single Next.js app (Genkit, direct Firestore hooks, etc.) is preserved at:

**`../sales-portal-backup/`**

Migrate features from there into `frontend/` and `backend/functions/` incrementally.
