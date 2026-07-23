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
| `unit/services/generate-dashboard-forecasts.unit.test.ts` ✅ | Fallback forecasts + actor reshape | TC-DASH-08 |
| `unit/services/map-owner-subscriptions.unit.test.ts` | Subscription timeline mapping | TC-DASH-05, TC-DASH-09 |
| `unit/services/build-platform-alerts.unit.test.ts` ✅ | Demo / new-user / subscription alerts | TC-DASH-13 |
| `unit/services/inactive-owner-contacts.unit.test.ts` ✅ | Attach `lastContactedAt` to owners | TC-DASH-14 |
| `unit/services/build-todays-work-inbox.unit.test.ts` | Today’s work dedupe | TC-DASH-07 |
| `unit/services/build-new-joiners.unit.test.ts` | New joiners aggregation | TC-DASH-07 |
| `unit/services/filter-new-joiners-for-actor.unit.test.ts` | Role-scoped joiners | TC-DASH-07 |
| `unit/services/events-training-playback.unit.test.ts` ✅ | YouTube / iframe playback normalize | Events & Training videos |
| `unit/services/events-training-visibility.unit.test.ts` ✅ | Visibility enum (`public`/`premium`/`private`) | Events & Training videos |
| `unit/services/events-training-ops.unit.test.ts` ✅ | Registration transitions, capacity, analytics period clamp | Registrations / analytics |
| `unit/services/webinar-promotion-automation.unit.test.ts` ✅ | Email-only promotion milestones | Schedules / automation |
| `unit/services/schedule-message-composer.unit.test.ts` ✅ | Email caption composer | Schedules preview |

---

## Backend — integration (Vitest + Supertest)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `integration/health.integration.test.ts` ✅ | `GET /health` | — |
| `integration/auth.integration.test.ts` ✅ | `/auth/status` auth errors | TC-AUTH-04, TC-NEG-01 |
| `integration/dashboard.integration.test.ts` 🔲 | Analytics route guards | TC-DASH-01, TC-NEG-02 |
| `integration/admin-catalog.integration.test.ts` 🔲 | Catalog CRUD routes | TC-SUB-02 … TC-SUB-06 |
| `integration/content-studio.integration.test.ts` 🔲 | Generate route validation | TC-CS-03 |

---

## Backend — BDD (Playwright API)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `bdd/health.spec.ts` ✅ | Emulator health endpoint | — |
| `bdd/auth.spec.ts` ✅ | Seeded user auth status | TC-AUTH-05 … TC-AUTH-08 |
| `bdd/dashboard-analytics.spec.ts` ✅ | Analytics JSON contract + role scope + forecasts | TC-DASH-01, TC-DASH-07, TC-DASH-08 |
| `bdd/admin-users.spec.ts` ✅ | Admin user routes | TC-ADM-01 |
| `bdd/admin-catalog.spec.ts` 🔲 | Catalog lifecycle | TC-SUB-* |
| `bdd/content-studio.spec.ts` 🔲 | Generate flow | TC-CS-02 |

**Run:** `cd backend && npm run test:bdd:local`

---

## Frontend — unit (Vitest)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `unit/features/dashboard/nav-items.test.ts` ✅ | Role-based nav + dashboard children + Events & Training | TC-AUTH-07, TC-NAV-02, TC-DASH-06, TC-ET-10 |
| `unit/features/dashboard/resolve-dashboard-page-title.test.ts` ✅ | Shell header titles per route | TC-DASH-06, TC-DASH-07, TC-ET-* |
| `unit/features/dashboard/app-chart-groups.test.ts` ✅ | Non-overlapping per-app chart kinds | TC-DASH-06, TC-DASH-07 |
| `unit/features/dashboard/forecast-items.test.ts` ✅ | Forecast slice per app | TC-DASH-08 |
| `unit/features/dashboard/build-hub-app-stats.test.ts` ✅ | Hub KPI grouping | TC-DASH-01 |
| `unit/features/dashboard/sort-active-owners.test.ts` ✅ | Inactive sort + list cap | TC-DASH-10 |
| `unit/features/dashboard/inactive-owner-contact.test.ts` ✅ | 7-day Contact cooldown | TC-DASH-14 |
| `unit/lib/email/new-user-welcome-template.test.ts` ✅ | New-user outreach template copy | TC-DASH-13 |
| `unit/lib/email/demo-inquiry-template.test.ts` ✅ | Demo-inquiry outreach template copy | TC-DASH-13 |
| `unit/lib/email/inactive-owner-template.test.ts` ✅ | Inactive-owner outreach template copy | TC-DASH-14 |
| `unit/features/dashboard/build-subscription-approval-queue.test.ts` ✅ | Approval queue rows | TC-DASH-05, TC-DASH-09 |
| `unit/lib/dashboard-analytics-normalize.test.ts` ✅ | `newJoiners`, `dashboardForecasts` defaults | TC-DASH-01 |
| `unit/lib/subscription-attachments.test.ts` ✅ | Receipt/attachment URL helpers | TC-DASH-09 |
| `unit/lib/auth-status.test.ts` 🔲 | Post-login path resolution | TC-AUTH-05, TC-AUTH-06 |
| `unit/lib/bff-url.test.ts` 🔲 | Dev/prod API URL selection | — |

---

## Frontend — BDD (Playwright UI)

| Test file | Covers | Manual QA |
|-----------|--------|-----------|
| `bdd/login.spec.ts` ✅ | Login page renders | TC-AUTH-01 |
| `bdd/dashboard.spec.ts` ✅ | Dashboard routes unauthenticated redirect | TC-DASH-01, TC-DASH-06, TC-DASH-07 |
| `bdd/mobile-nav.spec.ts` ✅ | Mobile nav smoke | TC-NAV-03 |
| `bdd/content-studio.spec.ts` 🔲 | Content studio form | TC-CS-01 |
| `bdd/subscriptions-catalog.spec.ts` 🔲 | Admin catalog pages | TC-SUB-01 |
| `bdd/admin-permissions.spec.ts` 🔲 | Permissions UI | TC-ADM-01, TC-ADM-02 |

**Run:** `cd frontend && npm run test:bdd:install && npm run test:bdd`

---

## Coverage priorities (next)

1. Authenticated frontend BDD for dashboard tabs (Actions/Forecast, Actions/Joiners) with seeded emulator user
2. Backend integration tests for `auth-middleware` (401/403) on `/dashboard/analytics`
3. Chart breakdown formatter unit tests
4. Content Studio integration test with mocked Gemini client

Update this file when adding or renaming test files.
