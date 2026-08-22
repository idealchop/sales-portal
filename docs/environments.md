# Environments (Dev / Prod)

Same Firebase project: **`aquaflow-management-suite`**. Auth is shared; primary Firestore data is **not**.

## Phase 1 (current) — Dev only

Prod App Hosting, Prod Functions, and `riverdb` stay as they are today. Do **not** move live branches until Dev is verified.

| Surface | Dev | Prod (unchanged) |
|---------|-----|------------------|
| Git branch | `dev` | current live branch (`sales-portal` / production) |
| Primary Firestore | `riverdb-dev` | `riverdb` |
| Legacy SmartRefill Firestore | `prod-smartrefill` | `prod-smartrefill` |
| App Hosting | **new** `dev-sales-portal` | `sales-portal` → `sales-river-tech.web.app` |
| Cloud Functions | `salesPortalApiDev` | `salesPortalApi` |
| SmartRefill proxy | `smartrefillV3ApiDev` | `smartrefillV3Api` |

### Why both databases?

- **`riverdb-dev`** — Sales Portal users, dashboards, admin, Events & Training, proposals (safe to mutate in Dev).
- **`prod-smartrefill`** — Legacy SmartRefill ops dashboard (`/dashboard/smartrefill-old/*`). Same named DB in Dev and Prod so ops tooling keeps reading real legacy station data.

### Console setup (Dev)

1. Ensure Firestore database **`riverdb-dev`** exists (same region as `riverdb`; already used by SmartRefill Dev).
2. Create App Hosting backend **`dev-sales-portal`**: connect this repo, Root directory **`frontend`**, live branch **`dev`**, Environment name **`dev`**.
3. Auth → Authorized domains: add the Dev `*.hosted.app` hostname for `dev-sales-portal`.
4. reCAPTCHA Enterprise key `sales-portal`: allowlist the same Dev hostname (+ existing Prod hosts).
5. Deploy Dev API:

```bash
cd backend
ENV=dev ./deploy.sh
# Optional on-demand scheduler against riverdb-dev:
ENV=dev DEPLOY_DEV_JOBS=1 ./deploy.sh
# Optional rules/indexes on riverdb-dev (usually deployed via SmartRefill):
ENV=dev DEPLOY_FIRESTORE=1 ./deploy.sh
```

### App Hosting env files

- Prod defaults: `frontend/apphosting.yaml` (do not change for Phase 1).
- Dev overrides: `frontend/apphosting.dev.yaml` (merged when Environment name = `dev`).

### Local development (= Dev)

Keep local env files aligned with hosted Dev so you hit the same data and API tier:

| Surface | Local setting |
|--------|----------------|
| Firestore | `riverdb-dev` (`NEXT_PUBLIC_FIRESTORE_DB` / `SALES_PORTAL_FIRESTORE_DB`) |
| Sales API (local process) | `http://127.0.0.1:8071` via `NEXT_PUBLIC_SALES_PORTAL_API_URL_DEV` |
| Sales / SmartRefill hosted fallbacks | `salesPortalApiDev` / `smartrefillV3ApiDev` |
| Gemini (Sales BE) | `SALES_PORTAL_GEMINI_API_KEY_DEV` (dedicated “sales-portal” key) |
| Legacy SmartRefill DB | `prod-smartrefill` (unchanged) |

Copy from `.env.example` → **`backend/functions/.env.local`** (preferred — Firebase never deploys `.env.local`), then fill secrets. Do **not** use a plain `functions/.env` for local Dev: Firebase dotenv-uploads `.env` on deploy and can flip Prod `salesPortalApi` onto `riverdb-dev`. Restart Next and `serve:local` after changes.

### Pause Dev jobs without undeploying

Set `SALES_PORTAL_DEV_JOBS_ENABLED=false` on the `*Dev` Cloud Run services. Handlers no-op until unset or set back to `true`. Dev tier is also inferred from function names ending in `Dev` (uses `riverdb-dev` + Dev SmartRefill API URL; legacy stays `prod-smartrefill`).

### Clone Prod → Dev (admin)

Admins on **Prod** Sales Portal can open **Admin → Clone Prod → Dev** (`/admin/clone-prod-to-dev`) to:

1. Export `riverdb` to GCS (`smartrefill-singapore/sales-portal/firestore-exports/…`)
2. Delete the existing `riverdb-dev` database
3. Recreate an empty `riverdb-dev` in the same region
4. Import the export into `riverdb-dev`

Firebase Auth is **not** touched (shared across tiers). After a successful clone, redeploy Dev rules/indexes if needed:

```bash
cd backend && ENV=dev DEPLOY_FIRESTORE=1 ./deploy.sh
```

The job is async; the page polls until export → delete → create → import finishes. Requires Prod `salesPortalApi` and IAM for Firestore Admin export/import/delete/create plus write access to the export bucket.

## Phase 2 (deferred) — Prod cutover

Only after Dev works end-to-end:

1. Point Prod App Hosting live branch as needed.
2. Keep `salesPortalApi` on `riverdb` + `prod-smartrefill` for legacy.

Do not run Phase 2 as part of the initial Dev rollout.
