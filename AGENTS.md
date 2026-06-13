# Sales Portal — Agent guide

Monorepo for Smart Refill **Sales Portal v2** (internal sales/analytics tool).

## Start here

Read the documentation index before implementing features:

**[`docs/README.md`](docs/README.md)**

## Repository map

| Path | Purpose |
|------|---------|
| `frontend/` | Next.js 16 App Router UI |
| `backend/functions/` | `salesPortalApi` Express gateway |
| `backend/firestore.rules` | Copy of canonical rules (sync from SmartRefill) |
| `docs/` | Architecture, auth, testing, manual QA |

## Canonical external docs

| Topic | Path |
|-------|------|
| Firestore rules (canonical) | `smartrefill/frontend/firestore.rules` |
| SmartRefill platform docs | `smartrefill/frontend/docs/README.md` |
| Shared GCP project | `aquaflow-management-suite` / `riverdb` |

## Testing protocol

Three layers — see [`docs/testing-guide.md`](docs/testing-guide.md):

1. **Unit** — Vitest (`src/__tests__/unit/`)
2. **Integration** — Vitest + Supertest (backend)
3. **BDD** — Playwright (`src/__tests__/bdd/`)

```bash
npm run test:unit
npm run test:all:local
```

## Deploy

```bash
cd backend && ./deploy.sh
```

Requires `SALES_PORTAL_GEMINI_API_KEY` in Secret Manager — see root README.

## Do not commit

- `.env`, `.env.local`, `backend/secrets.env`
- Firebase service account keys
