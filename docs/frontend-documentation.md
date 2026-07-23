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
| `NEXT_PUBLIC_SMARTREFILL_APP_URL` | Smart Refill public origin for Resources share links (default `https://app.smartrefill.io`) |

Production values are in **`frontend/apphosting.yaml`** (Firebase App Hosting).

## App Router structure

```text
frontend/src/app/
├── page.tsx                    # Redirect to login or dashboard
├── login/
├── onboarding/
├── dashboard/                  # Multi-app analytics shell
│   ├── page.tsx                # Platform hub
│   ├── smartrefill/            # SmartRefill app dashboard
│   └── sales-portal/           # Sales Portal app dashboard
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
| `proposals/` | `/dashboard/proposals/*`, `/proposal/view/*` | Proposals, clients, wizard, public share |
| `commissions/` | `/dashboard/commissions` | Commission earnings and payouts |
| `my-team/` | `/dashboard/my-team` | Manager team summary |
| `materials/` | `/dashboard/materials` | Sales materials library |
| `content-studio/` | `/content-studio` | AI social content |
| `events-training/` | `/events-training/*` | Resources CMS + webinar ops (manager/admin) |
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
| `/dashboard` | sales, manager, admin | Live — platform hub (rollup KPIs, map, per-app charts, ROI) |
| `/dashboard/smartrefill` | sales, manager, admin | Live — ops tabs: Attention (alerts + inactive owners), Subscriptions, Field ops (map/community), Analytics (KPIs, signals, charts) |
| `/dashboard/sales-portal` | sales, manager, admin | Live — rep KPIs, actions/joiners tabs, revenue charts, insights/forecast |
| `/dashboard/settings` | sales, manager, admin | Live — read-only profile |
| `/content-studio` | sales, manager, admin | Live |
| `/events-training/*` | manager, admin | Live — overview, analytics, registrations, moderation, webinars, stories, articles, tutorials, certs, schedules |
| `/subscriptions/*` | admin | Live (catalog CRUD) |
| `/admin/permissions` | admin | Live |
| `/admin/data-management` | admin | Live |
| `/dashboard/proposals` | sales+ | Live — proposals & clients list |
| `/dashboard/proposals/new` | sales+ | Live — create proposal wizard |
| `/proposal/view/[linkId]` | — | Live — public shareable proposal |
| `/dashboard/commissions` | sales+ | Live — commissions & monthly payouts |
| `/dashboard/materials` | sales+ | Live — materials library (admin CRUD) |
| `/dashboard/my-team` | manager | Live — team performance summary |

## App Hosting deploy

Config: `frontend/apphosting.yaml` (or root `apphosting.yaml` when building from monorepo root)

- Build: `npm run build` (includes `prepare-standalone.mjs` for static assets)
- Run: standalone server via App Hosting
- Hosting site: `sales-river-tech` → see root `firebase.json` hosting rewrites to Cloud Run `sales-portal`
- App Check: reCAPTCHA site key in env; debug token is local-only (`.env.local`)
- Cache: HTML responses use `no-store` (see `frontend/next.config.ts`) so deploys do not leave browsers on deleted `/_next/static` chunks; hashed assets stay immutable

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
