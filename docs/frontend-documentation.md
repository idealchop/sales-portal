# Frontend documentation

Next.js 16 App Router application in `frontend/`.

## Local development

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev              # http://127.0.0.1:9002
```

From monorepo root: `npm run dev:frontend`

## Environment variables

Copy from `.env.example` → `.env.local`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_DEV` | `true` for local API URLs |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase client config |
| `NEXT_PUBLIC_FIRESTORE_DB` | `riverdb` |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | App Check (reCAPTCHA v3) |
| `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN` | Local App Check debug token |
| `NEXT_PUBLIC_SALES_PORTAL_API_URL_DEV` | Default `http://127.0.0.1:8071` |
| `NEXT_PUBLIC_SMARTREFILL_API_URL_DEV` | SmartRefill emulator/prod URL |

Production values are in **`frontend/apphosting.yaml`** (Firebase App Hosting).

## App Router structure

```text
frontend/src/app/
├── page.tsx                    # Redirect to login or dashboard
├── login/
├── onboarding/
├── dashboard/                  # Main analytics shell
├── content-studio/
├── subscriptions/              # Admin catalog (plans, addons, vouchers)
└── admin/                      # Permissions, data management
```

## Feature modules

Business UI lives under `src/features/`:

| Folder | Routes | Description |
|--------|--------|-------------|
| `auth/` | `/login` | Login form + auth status |
| `onboarding/` | `/onboarding/*` | Setup wizard |
| `dashboard/` | `/dashboard/*` | Analytics, charts, insights |
| `content-studio/` | `/content-studio` | AI social content |
| `admin/` | `/admin/*` | Permissions, data management, catalog |

Navigation config: `features/dashboard/config/nav-items.ts` (`DASHBOARD_NAV`).

## API client

- **`lib/bff-url.ts`** — resolves Sales Portal + SmartRefill API base URLs
- **`lib/api-client.ts`** — authenticated fetch with Firebase ID token
- **`lib/auth-status.ts`** — post-login routing

All privileged reads/writes go through **salesPortalApi**, not direct Firestore client writes (except Firebase Auth).

## Key pages

| Path | Role | Status |
|------|------|--------|
| `/dashboard` | sales, manager, admin | Live |
| `/content-studio` | sales, manager, admin | Live |
| `/subscriptions/*` | admin | Live (catalog CRUD) |
| `/admin/permissions` | admin | Live |
| `/admin/data-management` | admin | Live |
| `/dashboard/proposals` | sales+ | Maintenance placeholder |
| `/dashboard/my-team` | manager | Maintenance placeholder |

## App Hosting deploy

Config: `frontend/apphosting.yaml` (or root `apphosting.yaml` when building from monorepo root)

- Build: `npm run build` (includes `prepare-standalone.mjs` for static assets)
- Run: standalone server via App Hosting
- Custom domain / Hosting site: `river-tech` → see root `firebase.json` hosting rewrites to Cloud Run `feature`
- App Check: reCAPTCHA site key in env; debug token is local-only (`.env.local`)

## Testing

See [testing-guide.md](../docs/testing-guide.md) and [`src/__tests__/README.md`](./src/__tests__/README.md).

```bash
npm run test:unit
npm run test:bdd:install   # Playwright Chromium
npm run test:bdd           # UI flows (starts dev server)
npm run test:all:local     # unit + BDD against running dev server
```

## Lint

```bash
npm run lint
```

## Related docs

- [components-structure.md](./components-structure.md)
- [auth-flow.md](./auth-flow.md)
- [frontend-test-cases.md](./frontend-test-cases.md)
