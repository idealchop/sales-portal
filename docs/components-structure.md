# Components structure

Feature-first organization under `frontend/src/`.

## Top-level layout

```text
frontend/src/
├── app/                 # Next.js routes (thin page wrappers)
├── components/          # Shared UI (logo, water background, …)
├── features/            # Domain modules
├── hooks/
└── lib/                 # Firebase, API client, utilities
```

## Feature modules

### `features/auth/`

- `components/login-page.tsx` — email/password login, auth status check

### `features/onboarding/`

- `components/onboarding-shell.tsx` — multi-step onboarding layout

### `features/dashboard/`

| Path | Purpose |
|------|---------|
| `config/dashboard-apps.ts` | App registry (platform, SmartRefill, Sales Portal) |
| `config/nav-items.ts` | Sidebar navigation + role gates + dashboard children |
| `components/dashboard-shell.tsx` | Layout, compact content column, analytics provider |
| `components/dashboard-header.tsx` | Page title, refresh, user menu |
| `components/platform-hub-dashboard.tsx` | Platform overview hub |
| `components/smartrefill-dashboard.tsx` | SmartRefill app dashboard |
| `components/sales-portal-dashboard.tsx` | Sales Portal app dashboard |
| `components/hub-app-stats-section.tsx` | Hub KPI rollup + per-app cards |
| `components/sales-portal-actions-joiners-section.tsx` | Actions \| New joiners tabs |
| `components/dashboard-actions-forecast-section.tsx` | Hub Actions \| Forecast tabs |
| `components/dashboard-insights-forecast-section.tsx` | App Insights \| Forecast tabs |
| `components/dashboard-forecast-panel.tsx` | Paginated AI/rule-based forecasts |
| `components/growth-charts-section.tsx` | Charts (Recharts), app-filtered |
| `lib/app-chart-groups.ts` | Per-app chart kind lists (no overlap) |
| `lib/sort-active-owners.ts` | Active owners priority sort + 5-row cap |
| `components/sales-insights-panel.tsx` | Action queue, health, pipeline detail |
| `components/active-owners-panel.tsx` | Owner list beside map |

### `features/content-studio/`

- `components/content-studio-page.tsx` — generate social posts/images
- `constants.ts` — tone/platform options

### `features/admin/`

Large admin surface for permissions and Firestore data management:

| Component area | Purpose |
|----------------|---------|
| `admin-permissions-page.tsx` | User access CRUD |
| `admin-data-management-page.tsx` | Business/user document browser |
| `admin-catalog-collection-page.tsx` | Subscription catalog tables |
| `catalog-document-form-*` | Structured add/edit forms (not raw JSON) |
| `plan-limitations-form-*` | Plan `limitations` editor |
| `firestore-document-detail-dialog.tsx` | Row click → read-only detail |

## Shared patterns

- **Dialogs** — detail/edit/delete flows for Firestore documents
- **Tables** — paginated lists with row actions; row click opens detail dialog where applicable
- **Forms** — `react-hook-form` + `zod` validation
- **Maps** — Leaflet via dynamic import loaders (`*-map-loader.tsx`)

## Role-based navigation

`DASHBOARD_NAV` entries include `roles: SalesPortalRole[]`. `dashboard-nav.tsx` filters items by the current user’s role from `/auth/status`.

Admin-only sections: **Subscriptions**, **Admin**.

## Styling

- Tailwind CSS 4 with CSS variables (`--primary`, `--border`, …)
- `clsx` + `tailwind-merge` for conditional classes

## Adding a new feature

1. Create `features/<name>/components/` and optional `hooks/`, `constants.ts`
2. Add route under `app/<route>/page.tsx` that imports the feature component
3. Add nav entry in `nav-items.ts` with appropriate `roles`
4. Add backend routes in `salesPortalApi` if server data is needed
5. Add tests — see [testing-guide.md](./testing-guide.md)
