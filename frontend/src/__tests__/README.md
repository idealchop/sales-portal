# Sales Portal frontend — Test layout

All automated tests live under `src/__tests__/`. See [docs/testing-guide.md](../../../docs/testing-guide.md).

| Folder | Runner | Purpose |
|--------|--------|---------|
| `unit/` | Vitest + jsdom | Hooks, config, pure UI logic |
| `integration/` | Vitest | Multi-module wiring (when added) |
| `bdd/` | Playwright | End-to-end UI flows |
| `setup/` | Vitest | `vitest-setup.ts` |

## Commands

```bash
npm run test              # unit (+ integration when added)
npm run test:unit
npm run test:bdd:install  # Chromium (one-time)
npm run test:bdd          # Playwright (starts dev server :9002)
npm run test:all:local    # unit + BDD (skip webServer if dev running)
```

From repo root: `npm run test:unit:frontend` · `npm run test:bdd:local`

## Unit tests

| File | Cases |
|------|-------|
| `unit/features/dashboard/nav-items.test.ts` | Role nav + multi-app dashboard + Events & Training children |
| `unit/features/dashboard/resolve-dashboard-page-title.test.ts` | Shell header titles incl. Events & Training |
| `unit/features/dashboard/app-chart-groups.test.ts` | SmartRefill vs Sales Portal chart kinds |
| `unit/features/dashboard/forecast-items.test.ts` | Forecast slices per app |
| `unit/features/dashboard/build-hub-app-stats.test.ts` | Hub KPI grouping |
| `unit/features/dashboard/sort-active-owners.test.ts` | Active owners sort + 5-row cap |
| `unit/features/dashboard/build-subscription-approval-queue.test.ts` | Approval queue rows |
| `unit/features/dashboard/build-user-subscriptions-list.test.ts` | Latest current plan; KPIs and groups (paying / voucher / trial / attention / ended); excludes test owners |
| `unit/lib/dashboard-analytics-normalize.test.ts` | API payload defaults |
| `unit/lib/subscription-attachments.test.ts` | Receipt/attachment helpers |
| `unit/lib/dashboard/subscription-labels.test.ts` | Trial labels; unpaid Starter displays as Free |
| `unit/features/lead-pipeline/lead-pipeline-display.test.ts` | Attempt tracks + Content source labels |
| `unit/features/lead-pipeline/lead-pipeline-insights.test.ts` | Insights queue mix |
| `unit/features/lead-pipeline/lead-pipeline-list.test.ts` | Table filters + content sources |
| `unit/lib/admin/catalog-document-forms.test.ts` | Product icon `waterContainer` persist |
| `unit/lib/admin/business-insights-display.test.ts` | Insights charts: tickets + gallons + other; order mix by channel |
| `unit/lib/admin/sign-in-attendance-heatmap.test.ts` | Owner sign-in year heatmap from login_events |
| `unit/features/events-training/webinar-feedback-display.test.ts` | Overall rating / recommend labels |

## BDD specs

| File | Cases |
|------|-------|
| `bdd/login.spec.ts` | Login page smoke (TC-AUTH-01) |
| `bdd/dashboard.spec.ts` | Hub + app dashboard unauthenticated redirect |
| `bdd/mobile-nav.spec.ts` | Mobile nav smoke |

Playwright projects: **Mobile Chrome** (320px) + **Desktop Chrome** (1280px).

## Manual QA

[docs/frontend-test-cases.md](../../../docs/frontend-test-cases.md) — full TC-* checklist.

Automated matrix: [docs/testing-test-summary.md](../../../docs/testing-test-summary.md).

## Adding tests

1. Pure logic / config → `unit/**/*.test.ts`
2. UI flow → `bdd/*.spec.ts`
3. Update `docs/testing-test-summary.md` with TC-* mapping
