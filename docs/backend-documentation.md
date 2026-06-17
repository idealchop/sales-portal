# Backend documentation (`salesPortalApi`)

Express gateway deployed as **`salesPortalApi`** (Cloud Functions v2, `asia-southeast1`, codebase `sales-portal-api`).

## Local development

```bash
cd backend/functions
cp .env.example .env
npm install
npm run serve:local    # http://127.0.0.1:8071
npm run test:unit
npm run test:integration
```

Emulator URL (when using Firebase emulators):

```text
http://127.0.0.1:5001/aquaflow-management-suite/asia-southeast1/salesPortalApi
```

Production URL:

```text
https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/salesPortalApi
```

## Environment

| Variable | Source | Purpose |
|----------|--------|---------|
| `SALES_PORTAL_FIREBASE_PROJECT_ID` | `firebase.json` / `.env` | GCP project |
| `SALES_PORTAL_FIRESTORE_DB` | `firebase.json` / `.env` | `riverdb` |
| `SMARTREFILL_API_URL` | `firebase.json` / `.env` | Proxy target |
| `SALES_PORTAL_GEMINI_API_KEY` | Secret Manager (prod) / `.env` (local) | AI features |
| `SALES_PORTAL_FIREBASE_CLIENT_EMAIL` | `.env` (local only) | Admin SDK |
| `SALES_PORTAL_FIREBASE_PRIVATE_KEY` | `.env` (local only) | Admin SDK |

See `backend/secrets.env.example` and root README **Secrets** section.

## Route catalog

All routes are mounted at the function root (no `/api` prefix).

### Public / health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Service health |

### Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/auth/status` | Bearer | Portal access + role + onboarding |
| `POST` | `/auth/login` | Bearer | Record login event |

### Dashboard (`/dashboard`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard/analytics` | Portal | Platform analytics payload |
| `POST` | `/dashboard/subscriptions/:businessId/:subscriptionId/approve` | Portal | Approve pending subscription |

### Content Studio (`/content-studio`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/content-studio/generate` | Portal | AI social post + image generation |

### Onboarding (`/onboarding`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/onboarding/managers` | Portal | Manager list for sales onboarding |
| `POST` | `/onboarding/avatar` | Portal | Avatar upload |
| `POST` | `/onboarding/complete` | Portal | Complete onboarding profile |

### Sales workflow

Portal routes require **Bearer token**, **sales-portal access**, and role-scoped data (`sales`, `manager`, or `admin`). Public proposal links are unauthenticated.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/proposals` | Portal | List proposals (role-scoped) |
| `POST` | `/proposals` | Portal | Create proposal |
| `GET` | `/proposals/:proposalId` | Portal | Get proposal |
| `PATCH` | `/proposals/:proposalId` | Portal | Update proposal |
| `POST` | `/proposals/:proposalId/share` | Portal | Create shareable link |
| `GET` | `/clients` | Portal | List clients (role-scoped) |
| `POST` | `/clients` | Portal | Create client |
| `PATCH` | `/clients/:clientId` | Portal | Update client |
| `GET` | `/commissions` | Portal | List commissions (role-scoped) |
| `GET` | `/sales/team` | Portal | Manager team summary |
| `GET` | `/sales-materials` | Portal | List sales materials |
| `POST` | `/sales-materials` | Admin | Create material |
| `PATCH` | `/sales-materials/:materialId` | Admin | Update material |
| `DELETE` | `/sales-materials/:materialId` | Admin | Delete material |
| `GET` | `/public/proposals/:linkId` | — | Public proposal + client view |

### SmartRefill proxy (`/smartrefill`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `ALL` | `/smartrefill/*` | Bearer | Forwards to SmartRefill V3 API |

### Admin (`/admin`)

All admin routes require **Bearer token**, **sales-portal access**, and **`admin` role**.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/users` | User list with `appAccess` summary |
| `POST` | `/admin/users` | Create Firebase Auth user + profile |
| `POST` | `/admin/users/bulk-delete` | Bulk delete users |
| `POST` | `/admin/users/:uid/revoke-access` | Revoke all app access for a user |
| `PATCH` | `/admin/users/:uid/app-access` | Grant/revoke portal and product app access |
| `GET` | `/admin/users/:uid/documents` | List Firestore documents for a user |
| `PUT` | `/admin/users/:uid/documents` | Upsert user Firestore document |
| `DELETE` | `/admin/users/:uid/documents` | Delete user Firestore document |
| `DELETE` | `/admin/users/:uid/firestore-profile` | Delete user profile docs |
| `DELETE` | `/admin/users/:uid` | Delete user (Auth + Firestore) |
| `GET` | `/admin/data-management` | Businesses index for data management |
| `GET` | `/admin/catalog-collections/:collectionId` | List subscription catalog docs |
| `PUT` | `/admin/catalog-collections/:collectionId/documents` | Create/update catalog document |
| `DELETE` | `/admin/catalog-collections/:collectionId/documents` | Delete catalog document |
| `GET` | `/admin/businesses/:businessId/documents` | List business subcollection docs |
| `GET` | `/admin/businesses/:businessId/transactions` | Business transactions |
| `GET` | `/admin/businesses/:businessId/customers/:customerId/transactions` | Customer transactions |
| `GET` | `/admin/businesses/:businessId/customers/:customerId/inventory-assignments` | Customer inventory assignments |
| `PUT` | `/admin/businesses/:businessId/documents` | Upsert business document |
| `DELETE` | `/admin/businesses/:businessId/documents` | Delete business document |
| `DELETE` | `/admin/businesses/:businessId/firestore-tree` | Delete business Firestore subtree |

See route files under `backend/functions/src/routes/`.

## Middleware

| Middleware | File | Purpose |
|------------|------|---------|
| `validateFirebaseIdToken` | `middleware/auth-middleware.ts` | Verifies Bearer token |
| `requireSalesPortalAccess` | same | Ensures `appAccess.sales-portal` |
| `requireAdminRole` | admin routes | Admin-only gates |
| Global rate limit | `index.ts` | 3000 req / 15 min (skipped in emulator) |

## Project layout

```text
backend/functions/src/
├── index.ts              # Express app + Cloud Function export
├── local-server.ts       # ts-node-dev local server
├── config/               # Firebase admin, secrets list
├── middleware/
├── routes/
├── handlers/
└── services/             # Analytics, AI, admin, access control
```

## Deploy

```bash
cd backend
./deploy.sh
```

Pipeline: sync Firestore config → build → **unit + integration + BDD tests** → lint → secret check → deploy functions.

Optional: `DEPLOY_FIRESTORE=1`, `DEPLOY_STORAGE_RULES=1`.

## Testing

Three layers under `src/__tests__/` — see [testing-guide.md](../docs/testing-guide.md) and [`src/__tests__/README.md`](./src/__tests__/README.md).

```bash
npm run test:unit          # Vitest — services/utils
npm run test:integration   # Vitest + supertest — HTTP routes
npm run test:bdd           # Playwright — emulator API contracts
cd .. && npm run test:bdd:local   # emulators + seed + BDD
```

## Firestore sync

```bash
cd backend
npm run sync:firestore
npm run check:firestore
```

Canonical rules: `smartrefill/frontend/firestore.rules`.
