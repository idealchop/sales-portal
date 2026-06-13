# Testing test summary (automated matrix)

Maps automated tests to manual cases ([frontend-test-cases.md](./frontend-test-cases.md)).

Legend: ✅ implemented · 🔲 planned · ⏭ skipped

---

## Backend — unit (Vitest)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `unit/services/build-user-growth-breakdown.unit.test.ts` | Quarter signup rows, growth breakdown | TC-DASH-02 |
| `unit/services/compute-role-active-times.unit.test.ts` | Role active time buckets | TC-DASH-01 |
| `unit/services/compute-workspace-behavior.unit.test.ts` | Churn/growth/re-engagement profiles | TC-DASH-01 |
| `unit/services/count-smartrefill-user-roles.unit.test.ts` | Owner/admin/rider counts | TC-DASH-01 |
| `unit/services/generate-ai-sales-insights.unit.test.ts` | AI insight payload shaping | TC-DASH-01 |
| `unit/services/map-owner-subscriptions.unit.test.ts` | Subscription timeline mapping | TC-DASH-05 |

---

## Backend — integration (Vitest + Supertest)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `integration/health.integration.test.ts` ✅ | `GET /health` | — |
| `integration/auth.integration.test.ts` 🔲 | `/auth/status` auth errors | TC-AUTH-04, TC-NEG-01 |
| `integration/dashboard.integration.test.ts` 🔲 | Analytics route guards | TC-DASH-01, TC-NEG-02 |
| `integration/admin-catalog.integration.test.ts` 🔲 | Catalog CRUD routes | TC-SUB-02 … TC-SUB-06 |
| `integration/content-studio.integration.test.ts` 🔲 | Generate route validation | TC-CS-03 |

---

## Backend — BDD (Playwright API)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `bdd/health.spec.ts` ✅ | Emulator health endpoint | — |
| `bdd/auth.spec.ts` 🔲 | Seeded user auth status | TC-AUTH-05 … TC-AUTH-08 |
| `bdd/dashboard-analytics.spec.ts` 🔲 | Full analytics JSON contract | TC-DASH-01 |
| `bdd/admin-catalog.spec.ts` 🔲 | Catalog lifecycle | TC-SUB-* |
| `bdd/content-studio.spec.ts` 🔲 | Generate flow | TC-CS-02 |

**Run:** `cd backend && npm run test:bdd:local`

---

## Frontend — unit (Vitest)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `unit/features/dashboard/nav-items.test.ts` ✅ | Role-based nav config | TC-AUTH-07, TC-AUTH-08, TC-NAV-02 |
| `unit/lib/auth-status.test.ts` 🔲 | Post-login path resolution | TC-AUTH-05, TC-AUTH-06 |
| `unit/lib/bff-url.test.ts` 🔲 | Dev/prod API URL selection | — |

---

## Frontend — BDD (Playwright UI)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `bdd/login.spec.ts` ✅ | Login page renders | TC-AUTH-01 |
| `bdd/dashboard.spec.ts` 🔲 | Dashboard smoke (authenticated) | TC-DASH-01 |
| `bdd/content-studio.spec.ts` 🔲 | Content studio form | TC-CS-01 |
| `bdd/subscriptions-catalog.spec.ts` 🔲 | Admin catalog pages | TC-SUB-01 |
| `bdd/admin-permissions.spec.ts` 🔲 | Permissions UI | TC-ADM-01, TC-ADM-02 |

**Run:** `cd frontend && npm run test:bdd:install && npm run test:bdd`

---

## Coverage priorities (next)

1. Backend integration tests for `auth-middleware` (401/403)
2. Backend BDD with `seed-emulator.js` sales-portal users
3. Frontend BDD login → dashboard with test credentials / E2E bypass
4. Content Studio integration test with mocked Gemini client

Update this file when adding or renaming test files.
