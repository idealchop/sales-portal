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
| `unit/auth-account-tag.test.ts` ✅ | `authAccountTag` read/collect; test-owner id set | TC-DASH-15 |
| `unit/services/legacy-smartrefill-helpers.unit.test.ts` ✅ | Legacy station helpers / triage status | TC-DASH-16 |
| `unit/services/legacy-station-triage.unit.test.ts` ✅ | Contacted 15-day cooldown vs ignored forever | TC-DASH-16 |
| `unit/services/outreach-templates.unit.test.ts` ✅ | Brevo templates incl. `legacy_station`, `personalized` | TC-DASH-13, TC-DASH-16, TC-PROP-03 |
| `unit/services/outreach-recipients.unit.test.ts` ✅ | Recipient merge by email + app badges | TC-PROP-01 |
| `unit/services/clients-directory.unit.test.ts` ✅ | Platform user directory + app categorization | TC-PROP-02 |
| `unit/services/generate-ai-sales-insights.unit.test.ts` | AI insight payload shaping | TC-DASH-01 |
| `unit/services/generate-dashboard-forecasts.unit.test.ts` ✅ | Fallback forecasts + actor reshape | TC-DASH-08 |
| `unit/services/map-owner-subscriptions.unit.test.ts` | Subscription timeline mapping; addon line items + voucher/affiliate attribution | TC-DASH-05, TC-DASH-09, TC-SUB-05, TC-SUB-06 |
| `unit/services/build-platform-alerts.unit.test.ts` ✅ | Demo / new-user / subscription alerts | TC-DASH-13 |
| `unit/services/inactive-owner-contacts.unit.test.ts` ✅ | Attach `lastContactedAt` to owners | TC-DASH-14 |
| `unit/services/build-todays-work-inbox.unit.test.ts` | Today’s work dedupe | TC-DASH-07 |
| `unit/services/build-new-joiners.unit.test.ts` | New joiners aggregation | TC-DASH-07 |
| `unit/services/filter-new-joiners-for-actor.unit.test.ts` | Role-scoped joiners | TC-DASH-07 |
| `unit/services/events-training-playback.unit.test.ts` ✅ | YouTube / iframe playback normalize | Events & Training videos |
| `unit/services/events-training-visibility.unit.test.ts` ✅ | Visibility enum (`public`/`premium`/`private`) | Events & Training videos |
| `unit/services/events-training-ops.unit.test.ts` ✅ | Registration transitions, capacity, analytics period clamp | Registrations / analytics |
| `unit/services/events-training/webinar-feedback.unit.test.ts` ✅ | Rating average + pending-until-approved status | TC-ET-05c, TC-ET-07c |
| `unit/services/webinar-promotion-automation.unit.test.ts` ✅ | Email-only promotion milestones | Schedules / automation |
| `unit/services/schedule-message-composer.unit.test.ts` ✅ | Email caption composer | Schedules preview |
| `unit/services/leads-service.unit.test.ts` ✅ | Queue filters incl. Content leads | TC-LEAD-01 |
| `unit/services/gather-leads-service.unit.test.ts` ✅ | Gather insert/refresh; midnight full cron | TC-LEAD-02, TC-LEAD-03 |
| `unit/services/content-pipeline-leads.unit.test.ts` ✅ | Webinar/training/article/story merge + overlay; speaker as `contentReferrer` | TC-LEAD-01, TC-LEAD-02, TC-LEAD-05 |
| `unit/services/stamp-pipeline-affiliate.unit.test.ts` ✅ | Paying-station affiliate stamp + pipeline commission bump | TC-LEAD-05, TC-SUB-09 |

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
| `unit/features/dashboard/build-sales-market-report.test.ts` ✅ | Plan mix / ideals; excludes test stations | TC-DASH-07, TC-DASH-15 |
| `unit/features/dashboard/resolve-platform-kpi-breakdowns.test.ts` ✅ | Tier derivation; skips test-tagged contexts | TC-DASH-15 |
| `unit/features/dashboard/filter-chart-series.test.ts` ✅ | Range filters drop `authAccountTag=test` | TC-DASH-15 |
| `unit/lib/business-profile-display.test.ts` ✅ | Workspace Other info hides email-sent / job idempotency noise | TC-ADM-03 |
| `unit/lib/admin/business-insights-display.test.ts` ✅ | Insights charts: gallons vs other qty; order mix by channel | TC-ADM-03 |
| `unit/lib/admin/sign-in-attendance-heatmap.test.ts` ✅ | Owner sign-in year heatmap from login_events days | TC-ADM-03 |
| `unit/features/dashboard/build-user-subscriptions-list.test.ts` ✅ | Latest current plan; KPIs/groups (paying, voucher, trial, attention, ended); excludes test owners | TC-DASH-06, TC-DASH-15 |
| `unit/features/dashboard/with-latest-live-plans.test.ts` ✅ | Latest current plan overlay; unpaid Starter → Free | TC-DASH-06 |
| `unit/features/dashboard/sort-active-owners.test.ts` ✅ | Inactive sort + list cap | TC-DASH-10 |
| `unit/features/dashboard/inactive-owner-contact.test.ts` ✅ | 7-day Contact cooldown | TC-DASH-14 |
| `unit/lib/email/new-user-welcome-template.test.ts` ✅ | New-user outreach template copy | TC-DASH-13 |
| `unit/lib/email/demo-inquiry-template.test.ts` ✅ | Demo-inquiry outreach template copy | TC-DASH-13 |
| `unit/lib/email/inactive-owner-template.test.ts` ✅ | Inactive-owner outreach template copy | TC-DASH-14 |
| `unit/features/dashboard/platform-alert-data-management.test.ts` ✅ | Alert → Data management deep links | TC-DASH-13c |
| `unit/lib/email/legacy-station-template.test.ts` ✅ | Legacy station contact template copy | TC-DASH-16 |
| `unit/features/proposals/proposal-outreach-compose.test.ts` ✅ | Outreach template preview + bulk send summary | TC-PROP-03, TC-PROP-04 |
| `unit/features/dashboard/build-subscription-approval-queue.test.ts` ✅ | Approval queue rows | TC-DASH-05, TC-DASH-09 |
| `unit/lib/dashboard-analytics-normalize.test.ts` ✅ | `newJoiners`, `dashboardForecasts` defaults | TC-DASH-01 |
| `unit/lib/subscription-attachments.test.ts` ✅ | Receipt/attachment URL helpers | TC-DASH-09 |
| `unit/features/dashboard/build-sales-home-focus.test.ts` ✅ | Win/keep lists; no money fields | TC-DASH-07 |
| `unit/features/dashboard/build-sales-home-highlights.test.ts` ✅ | Subscriptions / SmartRefill / Admin watch counts; no money | TC-DASH-07 |
| `unit/features/lead-pipeline/lead-pipeline-display.test.ts` ✅ | Attempt tracks + content source labels | TC-LEAD-01 |
| `unit/features/lead-pipeline/lead-pipeline-insights.test.ts` ✅ | Queue mix incl. Content slice | TC-NAV-04 |
| `unit/features/lead-pipeline/lead-referral-partners.test.ts` ✅ | Referral success rate: paid Starter–Scale only; Free/trial/unpaid Starter excluded; content referrer; stalled-warm close-deal | TC-LEAD-05, TC-SUB-09 |
| `unit/lib/admin/plan-subscriber-roster.test.ts` ✅ | Plan / addon / voucher / affiliate station roster grouping | TC-SUB-01, TC-SUB-05, TC-SUB-06 |
| `unit/lib/dashboard/subscription-labels.test.ts` ✅ | Trial labels; `isPaidSubscribedPlan` paid vs Free/trial | TC-LEAD-05 |
| `unit/features/lead-pipeline/lead-pipeline-list.test.ts` ✅ | Table filters; content source/search | TC-LEAD-01 |
| `unit/features/events-training/webinar-feedback-display.test.ts` ✅ | Overall rating / recommend / public-exposure labels | TC-ET-05c, TC-ET-07c |
| `unit/lib/admin/catalog-document-forms.test.ts` ✅ | Product icon `waterContainer` persist; partner-code prefill (`ownerUserId`) | TC-SUB-08, TC-LEAD-05 |
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
