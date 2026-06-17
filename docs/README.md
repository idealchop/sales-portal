# Sales Portal — Technical documentation

Single source of truth for architecture, development, testing, and deployment.

**Monorepo:** `sales-portal/` · **Shared platform:** SmartRefill on `aquaflow-management-suite` / Firestore `riverdb`

## Core references

| Document | Purpose |
|----------|---------|
| [architecture-overview.md](./architecture-overview.md) | FE/BE split, SmartRefill integration, shared `riverdb` |
| [auth-flow.md](./auth-flow.md) | Login, onboarding, `users.appAccess`, role gates |
| [backend-documentation.md](./backend-documentation.md) | `salesPortalApi` routes, secrets, local server, deploy |
| [frontend-documentation.md](./frontend-documentation.md) | Next.js App Router, features, env vars, App Hosting |
| [components-structure.md](./components-structure.md) | Feature folders, shared UI, navigation |
| [testing-guide.md](./testing-guide.md) | **QA protocol** — unit, integration, BDD (FE + BE) |
| [backlog-actionable.md](./backlog-actionable.md) | **AB-01…AB-24** — implementation-ready backlog |
| [agent-workflow.md](./agent-workflow.md) | Feature + code review agents, `dev` branch model |

## QA & testing

| Document | Purpose |
|----------|---------|
| [testing-test-summary.md](./testing-test-summary.md) | Automated test matrix (unit / integration / BDD) |
| [frontend-test-cases.md](./frontend-test-cases.md) | Manual QA checklist (TC-* IDs) |

Test layout READMEs (run commands):

- Backend: [`backend/functions/src/__tests__/README.md`](../backend/functions/src/__tests__/README.md)
- Frontend: [`frontend/src/__tests__/README.md`](../frontend/src/__tests__/README.md)

## Repository map

| Area | Path |
|------|------|
| Frontend | `frontend/` |
| Backend API | `backend/functions/` |
| Firestore rules (copy) | `backend/firestore.rules` (canonical: `smartrefill/frontend/firestore.rules`) |
| Deploy script | `backend/deploy.sh` |
| Secrets | `backend/secrets.env.example`, `backend/scripts/set-secrets.sh` |

## Quick commands

```bash
# Dev
npm run dev:frontend          # Next.js :9002
npm run dev:api               # salesPortalApi local :8071

# Unit tests
npm run test:unit             # FE + BE Vitest
npm run test:unit:backend
npm run test:unit:frontend

# Full local QA (unit + BDD with emulators)
npm run test:all:local         # unit + BDD

# Pre-merge quality gate
npm run quality-gate

# Deploy API
cd backend && ./deploy.sh
```

## Related SmartRefill docs

Sales Portal shares Firestore rules and the SmartRefill V3 API proxy. For SmartRefill-specific schema and platform behavior, see `smartrefill/frontend/docs/README.md`.
