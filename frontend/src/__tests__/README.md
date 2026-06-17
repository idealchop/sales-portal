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
| `unit/features/dashboard/nav-items.test.ts` | Role nav + multi-app dashboard children |
| `unit/features/dashboard/resolve-dashboard-page-title.test.ts` | Shell header titles |
| `unit/features/dashboard/app-chart-groups.test.ts` | SmartRefill vs Sales Portal chart kinds |
| `unit/features/dashboard/forecast-items.test.ts` | Forecast slices per app |
| `unit/features/dashboard/build-hub-app-stats.test.ts` | Hub KPI grouping |
| `unit/features/dashboard/sort-active-owners.test.ts` | Active owners sort + 5-row cap |
| `unit/features/dashboard/build-subscription-approval-queue.test.ts` | Approval queue rows |
| `unit/lib/dashboard-analytics-normalize.test.ts` | API payload defaults |
| `unit/lib/subscription-attachments.test.ts` | Receipt/attachment helpers |

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
