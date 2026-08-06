# Sales Portal — Agent guide

Monorepo for Smart Refill **Sales Portal v2** (internal multi-app sales and analytics hub).

## Start here

Read the documentation index before implementing features:

**[`docs/README.md`](docs/README.md)**

Product backlog: **[`docs/backlog-actionable.md`](docs/backlog-actionable.md)** · Agent workflow: **[`docs/agent-workflow.md`](docs/agent-workflow.md)**

| Skill | Use for |
|-------|---------|
| `sales-portal-feature-agent` | AB items on `feature/SP-{tier}`; one commit per AB |
| `sales-portal-code-review-agent` | Review, quality gate, merge to `dev` |
| `river-ai-usage-oversight` | AI/Gemini/Imagen cost & usage oversight vs SmartRefill (repo: `.agents/skills/river-ai-usage-oversight`) |

**Base branch:** `dev` · **Feature branches:** `feature/SP-1` … `feature/SP-4`

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
| Shared GCP project | `aquaflow-management-suite` |
| Primary Firestore | `riverdb` (Prod) · `riverdb-dev` (hosted Dev) |
| Legacy SmartRefill Firestore | `prod-smartrefill` (Dev + Prod) |
| Dev API | `salesPortalApiDev` — see `docs/environments.md` |

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
cd backend && ./deploy.sh            # Prod
cd backend && ENV=dev ./deploy.sh    # Dev (riverdb-dev)
```

Requires `SALES_PORTAL_GEMINI_API_KEY` in Secret Manager — see root README.

## Do not commit

- `.env`, `.env.local`, `backend/secrets.env`
- Firebase service account keys
