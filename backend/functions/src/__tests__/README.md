# Sales Portal API — Test layout

All automated tests live under `src/__tests__/` (QA protocol). See [docs/testing-guide.md](../../../../docs/testing-guide.md).

| Folder | Runner | Purpose |
|--------|--------|---------|
| `unit/` | Vitest | Services, utils (isolated, no HTTP) |
| `integration/` | Vitest + Supertest | HTTP routes against Express `app` |
| `bdd/` | Playwright | Live API contract tests against emulator |
| `setup/` | Vitest | Shared setup |

## Commands

```bash
npm run test              # unit + integration
npm run test:unit
npm run test:integration
npm run test:bdd          # Playwright (requires Functions emulator on :5001)
npm run test:watch        # Vitest watch
```

From `backend/`:

```bash
npm run test:bdd:local    # emulators:exec + seed + BDD
```

## API base URLs

| Mode | URL |
|------|-----|
| Local server | `http://127.0.0.1:8071` |
| Emulator | `http://127.0.0.1:5001/aquaflow-management-suite/asia-southeast1/salesPortalApi` |
| Production | `https://asia-southeast1-aquaflow-management-suite.cloudfunctions.net/salesPortalApi` |

BDD helpers: `bdd/bdd-api.ts` (`API_PATH`).

## Unit tests (current)

| File | Domain |
|------|--------|
| `unit/services/build-user-growth-breakdown.unit.test.ts` | Dashboard growth breakdown |
| `unit/services/compute-role-active-times.unit.test.ts` | Login active-time analytics |
| `unit/services/compute-workspace-behavior.unit.test.ts` | Workspace behavior profiles |
| `unit/services/count-smartrefill-user-roles.unit.test.ts` | User role counting |
| `unit/services/generate-ai-sales-insights.unit.test.ts` | AI insights generation |
| `unit/services/generate-dashboard-forecasts.unit.test.ts` | Dashboard forecasts + actor reshape |
| `unit/services/map-owner-subscriptions.unit.test.ts` | Subscription timeline |
| `unit/services/build-todays-work-inbox.unit.test.ts` | Today’s work inbox |
| `unit/services/build-new-joiners.unit.test.ts` | New joiners |
| `unit/services/filter-new-joiners-for-actor.unit.test.ts` | Role-scoped joiners |
| `unit/services/sales-scope.unit.test.ts` | Sales actor scope |
| `unit/services/events-training-playback.unit.test.ts` | Playback URL / iframe normalize |
| `unit/services/events-training-visibility.unit.test.ts` | Video visibility enums |
| `unit/services/events-training-ops.unit.test.ts` | Registration + analytics helpers |
| `unit/services/webinar-promotion-automation.unit.test.ts` | Auto promotion milestone channels |
| `unit/services/schedule-message-composer.unit.test.ts` | Email caption composer |

## Integration tests

| File | Route |
|------|-------|
| `integration/health.integration.test.ts` | `GET /health` |
| `integration/auth.integration.test.ts` | Auth middleware 401/403 |
| `integration/admin-users.integration.test.ts` | Admin user routes |

## BDD specs

| File | Route / flow |
|------|--------------|
| `bdd/health.spec.ts` | `GET /health` (emulator) |
| `bdd/auth.spec.ts` | `GET /auth/status` (seeded sales user) |
| `bdd/dashboard-analytics.spec.ts` | `GET /dashboard/analytics` — forecasts, scope, chart series |
| `bdd/admin-users.spec.ts` | Admin user management |

## Manual QA cross-reference

[docs/testing-test-summary.md](../../../../docs/testing-test-summary.md) · [docs/frontend-test-cases.md](../../../../docs/frontend-test-cases.md)

## Adding tests

1. Pure logic → `unit/` with suffix `.unit.test.ts`
2. HTTP route → `integration/` with suffix `.integration.test.ts` or flow `*.bdd.test.ts`
3. Emulator contract → `bdd/*.spec.ts`
4. Update `docs/testing-test-summary.md`

Deploy runs `npm run test` via `backend/deploy.sh`.
