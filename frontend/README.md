# Sales Portal frontend

Next.js 16 application for the Smart Refill Sales Portal.

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev          # http://127.0.0.1:9002
```

From monorepo root: `npm run dev:frontend`

## Scripts

| Script | Purpose |
|--------|---------|
| `dev` | Development server |
| `build` | Production build |
| `start` | Production server |
| `lint` | ESLint |
| `test:unit` | Vitest unit tests |
| `test:bdd` | Playwright UI tests |
| `test:bdd:install` | Install Playwright Chromium |
| `test:all:local` | Unit + BDD |

## Environment

See `.env.example` and **`apphosting.yaml`** for production App Hosting config.

## Documentation

- [docs/frontend-documentation.md](../docs/frontend-documentation.md)
- [docs/components-structure.md](../docs/components-structure.md)
- [docs/frontend-test-cases.md](../docs/frontend-test-cases.md)
- [src/__tests__/README.md](./src/__tests__/README.md)

## Features

| Route | Feature module |
|-------|----------------|
| `/login` | `features/auth` |
| `/dashboard` | `features/dashboard` |
| `/content-studio` | `features/content-studio` |
| `/subscriptions/*` | `features/admin` (catalog) |
| `/admin/*` | `features/admin` |

Agent rules: [AGENTS.md](./AGENTS.md)
