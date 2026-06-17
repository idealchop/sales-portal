# Testing guide (QA protocol)

Sales Portal follows the same **three-layer QA protocol** as SmartRefill:

| Layer | Runner | Location | Purpose |
|-------|--------|----------|---------|
| **Unit** | Vitest | `*/src/__tests__/unit/` | Pure logic, services, hooks, formatters |
| **Integration** | Vitest + Supertest | `backend/.../integration/` | HTTP routes, multi-step flows (`*.integration.test.ts`, `*.bdd.test.ts`) |
| **BDD** | Playwright | `*/src/__tests__/bdd/` | Live API (backend) and UI (frontend) contract tests |

> **Note:** “BDD” here means **Playwright behavior specs**, not Cucumber/Gherkin `.feature` files.

## Quick reference

```bash
# From repo root
npm run test:unit                 # frontend + backend unit
npm run test:unit:backend
npm run test:unit:frontend
npm run test:bdd:local            # emulators + API BDD + UI BDD
npm run test:all:local            # unit + BDD local

# Backend only (backend/functions)
npm run test:unit
npm run test:integration
npm run test:bdd                  # requires Functions emulator

# Frontend only (frontend)
npm run test:unit
npm run test:bdd:install
npm run test:bdd
```

## Backend unit tests

**Path:** `backend/functions/src/__tests__/unit/`

Current coverage focuses on **dashboard analytics helpers**:

- `build-user-growth-breakdown.unit.test.ts`
- `compute-role-active-times.unit.test.ts`
- `compute-workspace-behavior.unit.test.ts`
- `count-smartrefill-user-roles.unit.test.ts`
- `generate-ai-sales-insights.unit.test.ts`
- `generate-dashboard-forecasts.unit.test.ts` — fallback forecasts + `reshapeForecastsForActor`
- `map-owner-subscriptions.unit.test.ts`
- `build-todays-work-inbox.unit.test.ts`
- `build-new-joiners.unit.test.ts`
- `filter-new-joiners-for-actor.unit.test.ts`

**Run:**

```bash
cd backend/functions
npm run test:unit
npm run test:watch    # watch mode
```

**When to add:** Any pure function in `services/` — especially analytics, formatting, access normalization.

## Backend integration tests

**Path:** `backend/functions/src/__tests__/integration/`

Uses **Supertest** against the exported Express `app` from `src/index.ts`.

**Example:** `health.integration.test.ts` — `GET /health` returns 200.

**Run:**

```bash
cd backend/functions
npm run test:integration
```

**When to add:**

- New route modules (`auth`, `dashboard`, `admin`, `onboarding`, `content-studio`)
- Middleware behavior (401/403 without token)
- Flow tests named `*.bdd.test.ts` for multi-request sequences

**Tips:**

- Set `process.env.FUNCTIONS_EMULATOR = "true"` in tests to skip rate limits
- Mock firebase-admin for Firestore-dependent handlers (see SmartRefill integration tests)

## Backend BDD (Playwright API)

**Path:** `backend/functions/src/__tests__/bdd/`

Playwright **`request` API** against the Functions emulator:

```text
http://127.0.0.1:5001/aquaflow-management-suite/asia-southeast1/salesPortalApi
```

Shared helpers: `bdd-api.ts` (`API_PATH`, auth tokens, seed helpers).

**Run locally (full stack):**

```bash
cd backend
npm run test:bdd:local
```

This runs `firebase emulators:exec` with `seed-emulator.js`, then Playwright specs.

**Run specs only** (emulator already up):

```bash
cd backend/functions
npm run test:bdd
```

**Planned specs** (add as features stabilize):

| Spec | Covers |
|------|--------|
| `health.spec.ts` | `GET /health` |
| `auth.spec.ts` | `/auth/status` with seeded user |
| `dashboard-analytics.spec.ts` | `GET /dashboard/analytics` — forecasts, scope, chart series |
| `admin-catalog.spec.ts` | Catalog CRUD |
| `content-studio.spec.ts` | `POST /content-studio/generate` (requires Gemini key or mock) |

## Frontend unit tests

**Path:** `frontend/src/__tests__/unit/`

Uses Vitest + jsdom. Path alias `@/` → `src/`.

**Run:**

```bash
cd frontend
npm run test:unit
```

**When to add:**

- Nav/role filtering (`nav-items.test.ts`)
- Per-app chart config (`app-chart-groups.test.ts`)
- Forecast slices (`forecast-items.test.ts`, `generate-dashboard-forecasts.unit.test.ts`)
- Active owners sort (`sort-active-owners.test.ts`)
- Analytics normalize defaults (`dashboard-analytics-normalize.test.ts`)
- Chart/breakdown formatters
- Form validation schemas (zod)
- API client error mapping

**Setup:** `src/__tests__/setup/vitest-setup.ts`

## Frontend BDD (Playwright UI)

**Path:** `frontend/src/__tests__/bdd/`

Playwright browser tests at **320px (mobile)** and **1280px (desktop)** via projects in `playwright.config.ts`.

**Run:**

```bash
cd frontend
npm run test:bdd:install    # one-time Chromium install
npm run test:bdd            # starts dev server on :9002 by default
```

Skip webServer when dev server already running:

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:bdd
```

**Current / planned specs:**

| Spec | Manual QA IDs |
|------|---------------|
| `login.spec.ts` | TC-AUTH-01, TC-AUTH-02 |
| `dashboard.spec.ts` | TC-DASH-01, TC-DASH-06, TC-DASH-07 — unauthenticated redirect for hub + app dashboards |
| `content-studio.spec.ts` | TC-CS-01 … |
| `admin-permissions.spec.ts` | TC-ADM-01 … |
| `subscriptions-catalog.spec.ts` | TC-SUB-01 … |

## Deploy gate

`backend/deploy.sh` runs **`npm run test`** (unit + integration via Vitest) before deploy. BDD is run locally via `npm run test:bdd:local` or CI (when configured).

## Manual QA cross-reference

| Doc | Purpose |
|-----|---------|
| [frontend-test-cases.md](./frontend-test-cases.md) | Full manual checklist |
| [testing-test-summary.md](./testing-test-summary.md) | Automated ↔ manual mapping |

## Writing new tests — checklist

1. **Unit first** — cheapest feedback for pure logic
2. **Integration** — route contract before emulator BDD
3. **BDD** — end-to-end with emulators + seed data
4. Update **`testing-test-summary.md`** with file path + TC-* IDs
5. Link from feature README in `src/__tests__/README.md`

## SmartRefill reference

SmartRefill’s mature test tree lives at `smartrefill/backend/functions/src/__tests__/` and `smartrefill/frontend/src/__tests__/`. Mirror naming and folder conventions when porting patterns.
