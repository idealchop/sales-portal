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

Dev URL (hosted Dev tier — `riverdb-dev`):

```text
https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/salesPortalApiDev
```

See [environments.md](./environments.md) for Dev / Prod tier setup.

## Environment

| Variable | Source | Purpose |
|----------|--------|---------|
| `SALES_PORTAL_FIREBASE_PROJECT_ID` | `firebase.json` / `.env` | GCP project |
| `SALES_PORTAL_FIRESTORE_DB` | `firebase.json` / `.env` | `riverdb` (Prod); hosted Dev forces `riverdb-dev` via `*Dev` function name |
| `SALES_PORTAL_LEGACY_FIRESTORE_DB` | `.env` (optional) | `prod-smartrefill` — SmartRefill (legacy) dashboard (Dev + Prod) |
| `SMARTREFILL_API_URL` | `firebase.json` / `.env` | Proxy target (Prod); hosted Dev forces `smartrefillV3ApiDev` |
| `SALES_PORTAL_GEMINI_API_KEY` | Secret Manager (prod) / `.env` (local) | AI features |
| `SMARTREFILL_BREVO_API_KEY` | Secret Manager (shared with SmartRefill) | Transactional outreach email (Contact / How are you?) |
| `BREVO_WEBHOOK_TOKEN` | Optional env / Secret Manager | Shared token for Brevo open webhook (`?token=` or `x-brevo-token`) |
| `SALES_PORTAL_FIREBASE_CLIENT_EMAIL` | `.env` (local only) | Admin SDK |
| `SALES_PORTAL_FIREBASE_PRIVATE_KEY` | `.env` (local only) | Admin SDK |

See `backend/secrets.env.example` and root README **Secrets** section.

## Route catalog

All routes are mounted at the function root (no `/api` prefix).

### Public / health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Service health |
| `POST` | `/webhooks/brevo/transactional` | Optional token | Brevo open events → lead status **Email opened** |

### Auth (`/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/auth/status` | Bearer | Portal access + role + onboarding |
| `POST` | `/auth/login` | Bearer | Record login event |

### Dashboard (`/dashboard`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/dashboard/analytics` | Portal | Platform analytics payload (scoped by role; includes rules-based `dashboardForecasts`, `personalSales`, `todaysWork`, `lastContactedAt` on owners). **No Gemini.** Excludes owners with `authAccountTag: "test"` from station/user/login/MRR KPIs. `growthSalesMetrics.subscriptionOwners` is every production workspace for the Subscriptions tab; `activeOwners` stays the recently-active / live-plan subset |
| `GET` | `/dashboard/smartrefill-old/analytics` | Portal | Legacy SmartRefill ops from `prod-smartrefill` (stations + charts) |
| `GET` | `/dashboard/smartrefill-old/stations/:stationId` | Portal | Legacy station customers + paginated deliveries |
| `POST` | `/dashboard/smartrefill-old/stations/:stationId/ignore` | Portal | Mark legacy station ignored (moves to Contacted / Ignored) |
| `POST` | `/dashboard/smartrefill-old/stations/:stationId/contact` | Portal | Send `legacy_station` Brevo email (BCC usual), then mark contacted (15-day cooldown → Triage; ignored stays handled) |
| `POST` | `/dashboard/smartrefill-old/stations/:stationId/restore` | Portal | Clear contacted/ignored and return station to Triage |
| `POST` | `/dashboard/smartrefill-old/stations/bulk-delete` | Manager/Admin | Bulk delete up to 50 legacy stations from `prod-smartrefill` |
| `POST` | `/dashboard/smartrefill-old/stations/bulk-ignore` | Portal | Bulk mark up to 50 legacy stations ignored |
| `POST` | `/dashboard/smartrefill-old/stations/bulk-contact` | Portal | Bulk Brevo outreach + mark contacted (up to 50) |
| `DELETE` | `/dashboard/smartrefill-old/stations/:stationId` | Manager/Admin | Permanently delete station + subcollections from `prod-smartrefill` |
| `PATCH` | `/dashboard/platform-alerts/:alertId/contact` | Portal | Mark alert contacted; optional Brevo outreach when `toEmail` is set (omit email to mark done only) |
| `PATCH` | `/dashboard/inactive-owners/:businessId/contact` | Portal | Send inactive-owner outreach via Brevo, then record timestamp (7-day Contact cooldown) |
| `POST` | `/dashboard/outreach/send` | Portal | Send Brevo outreach only (generic / named templates; no contact cooldown write) |
| `POST` | `/dashboard/subscriptions/:businessId/:subscriptionId/approve` | Portal | Approve pending subscription |
| `GET` | `/dashboard/subscriptions/:businessId/:subscriptionId/official-receipt` | Portal | Official Receipt PDF (single paid period) |
| `GET` | `/dashboard/subscriptions/:businessId/statement` | Portal | Statement of account PDF (all paid periods) |

### Content Studio (`/content-studio`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/content-studio/generate` | Portal | On-demand AI social post. Body: `{ prompt, mode?: "both"\|"caption"\|"image" }`. Rate limit 10/15m. English prompts skip scene translate. |

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
| `GET` | `/clients/directory` | Portal | Platform users as clients (with appAccess categories) |
| `POST` | `/clients` | Portal | Create client (optional `linkedUserId`) |
| `PATCH` | `/clients/:clientId` | Portal | Update client |
| `GET` | `/outreach/recipients` | Portal | Aggregated outreach recipients (platform users, CRM, webinar guests/members, story/article engagement members) |
| `POST` | `/outreach/send` | Portal | Send one Brevo outreach email per request (`personalized`, `demo_inquiry`, `new_user_registration`, `generic`); UI bulk send loops up to 50 recipients |
| `GET` | `/leads` | Portal | List leads from riverdb `leads` (`queue`=`all`\|`content`\|`warm`\|`cold`\|`onboarded`\|`archive`, `stage`, `assignee`, `q`). `content` is webinar/training/article/story emails. Does not rebuild SmartRefill/legacy live. Enriches linked workspaces with live `workspace` overlay (`planName`, `planCode`, `billingCycle`, `price`) so Insights can score paid vs Free/trial. |
| `GET` | `/leads/analytics` | Portal | Lead funnel / source / assignee / trial-risk aggregates |
| `POST` | `/leads/gather` | Portal | Pull SmartRefill + legacy + **content emails** into `leads`. Body `{ mode: "incremental" \| "full" }`. **Incremental** (UI **Gather new leads** button) inserts missing only. **Full** refreshes source fields and preserves CRM; also used by the midnight scheduler `leadPipelineGather`. Full promote `registered`→`onboarded` when SmartRefill `onboardingComplete` (never overwrites cold/archive). Refreshes onboarded journey snapshot including `planName` / `planCode` / `billingCycle` / `price`. Content-only guests get `sourceKind: "content"` and `sr-content:{hash}` ids; existing workspace leads get `contentSources` overlay; webinar `speaker` / article `author` persist as `contentReferrer` when CRM `referredBy` is empty. After writes, stamps pipeline affiliate onto the current paying subscription if checkout did not already set a code, and bumps affiliate `conversionCount` / `pendingCommissionAmount`. Returns `{ scanned, inserted, updated, skipped }`. |
| `POST` | `/leads/bulk-assign` | Portal | Mass assign. Body `{ leadIds, mode: "set"\|"add"\|"remove"\|"clear", assignedToUids? }`. Canonical field `assignedToUids[]`; keeps legacy `assignedToUid` as first assignee. |
| `GET` | `/leads/email-templates` | Portal | List personal + shared lead email blast templates |
| `POST` | `/leads/email-templates` | Portal | Create template (`visibility`: personal \| shared) |
| `PATCH` | `/leads/email-templates/:templateId` | Portal | Update template (owner, or manager/admin for shared) |
| `DELETE` | `/leads/email-templates/:templateId` | Portal | Delete template |
| `GET` | `/leads/email-blast/quota` | Portal | Daily blast quota (soft/hard cap 25 sent/user/UTC day) |
| `POST` | `/leads/email-blast` | Portal | Blast personalized emails via Brevo. Body `{ leadIds, subject, bodyText, countAsAttempt?, senderEmail? }`. Tokens `{{firstName}}` etc. Optional attempt bump. |
| `POST` | `/leads` | Portal | Create lead |
| `GET` | `/leads/:leadId` | Portal | Get lead |
| `PATCH` | `/leads/:leadId` | Portal | Update lead (stage, attempts, link `linkedBusinessId`, referral `referredBy` / `referredByAffiliateId` / `referredByAffiliateCode` / `referredByEmail`). Side effect: if the lead is onboarded on a paying Starter–Scale plan with an affiliate, stamps `affiliateCode` onto the current subscription when empty. GET never mutates. |
| `GET` | `/commissions` | Portal | List commissions (role-scoped) |
| `GET` | `/sales/team` | Portal | Manager team summary |
| `GET` | `/sales-materials` | Portal | List sales materials |
| `POST` | `/sales-materials` | Admin | Create material |
| `PATCH` | `/sales-materials/:materialId` | Admin | Update material |
| `DELETE` | `/sales-materials/:materialId` | Admin | Delete material |
| `GET` | `/public/proposals/:linkId` | — | Public proposal + client view |

### Events & Training (`/events-training`)

Manager/admin CMS + ops for Smart Refill Resources (shared `apps/smartrefill/*` on `riverdb`). Full detail: [`events-training.md`](./events-training.md).

| Method | Path | Description |
|--------|------|-------------|
| `GET/POST/PATCH/DELETE` | `/events-training/webinars` | Live webinar CRUD (list includes `feedbackSummary`) |
| `GET` | `/events-training/webinars/:id/feedback` | Webinar ratings + overall average; `publicSummary` is approved-only |
| `PATCH/DELETE` | `/events-training/webinars/:id/feedback/:feedbackId` | Show/hide or delete a webinar rating for the SmartRefill page |
| `GET/POST/PATCH/DELETE` | `/events-training/videos` | Training videos (`category` identity: `wrs_stories` \| `webinar` \| `tutorial`; `?category=` filter) |
| `GET` | `/events-training/apps` | List apps for tutorial targeting (`apps` collection) |
| `GET/POST/PATCH/DELETE` | `/events-training/blogs` | WRS blog CMS |
| `POST` | `/events-training/upload` | Image upload (poster/thumbnail/hero) |
| `GET` | `/events-training/registrations` | List registrants (`eventId`, `status`) |
| `POST` | `/events-training/registrations/:id/accept` | Accept registration |
| `POST` | `/events-training/registrations/:id/decline` | Decline registration |
| `DELETE` | `/events-training/registrations/:id` | Permanently delete registration |
| `GET/POST/PATCH/DELETE` | `/events-training/schedules` | Schedule rows + automated email promotions |
| `GET/PUT/POST` | `/events-training/webinars/:id/automation` | Install / pause / preview email promotion plan |
| `GET/PATCH/DELETE` | `/events-training/videos/:id/comments` | Moderate or delete video comments |
| `GET/PATCH/DELETE` | `/events-training/blogs/:id/comments` | Moderate or delete blog comments |
| `GET/PATCH/DELETE` | `/events-training/videos/:id/questions` | Answer / close / delete Q&A |
| `GET/POST` | `/events-training/certifications` | List / issue certificates |
| `POST` | `/events-training/certifications/:id/revoke` | Revoke certificate |
| `GET` | `/events-training/analytics` | Ops analytics summary |

**Scheduled jobs:**
- `eventsTrainingPromotionDelivery` (every 5 minutes) fires due automation schedules and enqueues email. See [`events-training.md`](./events-training.md).
- `leadPipelineGather` (00:00 Asia/Manila) full-gathers SmartRefill, legacy, and content emails into `leads` (CRM fields preserved). UI **Gather new leads** stays incremental.

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
| `GET` | `/dashboard/sales-home` | Lightweight rep-focused dashboard payload |
| `PATCH` | `/admin/users/:uid/app-access` | Grant/revoke portal and product app access; optional `authAccountTag: "test" \| null` (test accounts excluded from analytics) |
| `GET` | `/admin/users/:uid/documents` | List Firestore documents for a user |
| `PUT` | `/admin/users/:uid/documents` | Upsert user Firestore document |
| `DELETE` | `/admin/users/:uid/documents` | Delete user Firestore document |
| `DELETE` | `/admin/users/:uid/firestore-profile` | Delete user profile docs |
| `DELETE` | `/admin/users/:uid` | Delete user (Auth + Firestore) |
| `GET` | `/admin/data-management` | Businesses index for data management |
| `POST` | `/admin/data-management/clone-to-demo` | Clone owner workspace into `demo@smartrefill.com` (wipes previous demo clone only) |
| `GET` | `/admin/catalog-collections/:collectionId` | List subscription catalog docs (admin) |
| `PUT` | `/admin/catalog-collections/:collectionId/documents` | Save catalog document (admin; versioned collections save a **draft**) |
| `DELETE` | `/admin/catalog-collections/:collectionId/documents` | Delete catalog document (blocked for versioned plan/trial docs) |
| `GET` | `/dashboard/catalog-collections/:collectionId` | List catalog docs (all sales roles) |
| `PUT` | `/dashboard/catalog-collections/:collectionId/documents` | Save draft (plans/trial) or direct upsert (addons/vouchers/icons) |
| `POST` | `/dashboard/catalog-collections/:collectionId/documents/publish` | Publish draft; `effectiveAt` defaults to next Manila midnight |
| `POST` | `/dashboard/catalog-collections/:collectionId/documents/deactivate` | Hide from new sales (`isActive: false`); never delete live plans |
| `GET` | `/dashboard/catalog-collections/:collectionId/audit` | Who changed a catalog document |
| `GET` | `/admin/businesses/:businessId/documents` | List business subcollection docs |
| `GET` | `/admin/businesses/:businessId/transactions` | Business transactions |
| `GET` | `/admin/businesses/:businessId/customers/:customerId/transactions` | Customer transactions |
| `GET` | `/admin/businesses/:businessId/customers/:customerId/inventory-assignments` | Customer inventory assignments |
| `PUT` | `/admin/businesses/:businessId/documents` | Upsert business document |
| `DELETE` | `/admin/businesses/:businessId/documents` | Delete business document |
| `DELETE` | `/admin/businesses/:businessId/firestore-tree` | Delete business Firestore subtree |

See route files under `backend/functions/src/routes/`.

## Analytics notes

- **`dashboard-analytics-service`** builds `GET /dashboard/analytics`. It collects test owner UIDs via `collectTestAccountOwnerIds` (`auth-account-tag.ts`) and filters them out of business loops, user/login aggregates, virtual staff, growth metrics, forecasts, and map locations.
- **`legacy-smartrefill-analytics-service`** + `legacy-smartrefill-station-actions` power `/dashboard/smartrefill-old/*` against Firestore `prod-smartrefill`.
- Frontend defense-in-depth also skips `authAccountTag === "test"` in plan mix, chart filters, maps, and subscription lists.

## Middleware

| Middleware | File | Purpose |
|------------|------|---------|
| `validateFirebaseIdToken` | `middleware/auth-middleware.ts` | Verifies Bearer token |
| `requireSalesPortalAccess` | same | Ensures `appAccess.sales-portal` |
| `requireManagerOrAdminRole` | `middleware/require-admin.ts` | Manager/admin gates (Events & Training) |
| `requireAdminRole` | admin routes | Admin-only gates |
| Global rate limit | `index.ts` | 3000 req / 15 min (skipped in emulator) |

## Project layout

```text
backend/functions/src/
├── index.ts              # HTTP API + scheduled job exports
├── local-server.ts       # ts-node-dev local server
├── config/               # Firebase admin, secrets list
├── jobs/                 # Cloud Scheduler (lead gather, events-training)
├── middleware/
├── routes/
├── handlers/
└── services/             # Analytics, AI, admin, access control
```

## Deploy

```bash
cd backend
./deploy.sh                         # Prod — salesPortalApi → riverdb
ENV=dev ./deploy.sh                 # Dev — salesPortalApiDev → riverdb-dev
ENV=dev DEPLOY_DEV_JOBS=1 ./deploy.sh
```

Pipeline: sync Firestore config → build → **unit + integration + BDD tests** → lint → secret check → deploy functions.

Optional: `DEPLOY_FIRESTORE=1`, `DEPLOY_STORAGE_RULES=1` (Prod), `DEPLOY_DEV_JOBS=1` (Dev).

Full tier matrix: [environments.md](./environments.md).

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
