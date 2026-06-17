# Sales Portal — Agent workflow

Two Cursor Agent Skills automate backlog delivery on a **`dev`** integration branch.

| Agent skill | Path | Role |
|-------------|------|------|
| **Feature agent** | `.cursor/skills/sales-portal-feature-agent/` | Implement AB items on `feature/SP-{tier}`; one commit per AB |
| **Code review agent** | `.cursor/skills/sales-portal-code-review-agent/` | Review, quality gate, merge to `dev` |

Backlog source: [`backlog-actionable.md`](./backlog-actionable.md)

---

## Branch model

```
dev                          ← integration base (merge target)
 └── feature/SP-1            ← Tier 1 (AB-01…AB-06)
 └── feature/SP-2            ← Tier 2 (AB-07…AB-11)
 └── feature/SP-3            ← Tier 3 (AB-12…AB-19)
 └── feature/SP-4            ← Tier 4 (AB-20…AB-24) + AB-25
 └── feature/SP-5            ← Tier 6 (AB-26…AB-28)
 └── feature/SP-6            ← Tier 7 (AB-29…AB-35)
 └── feature/SP-8            ← Tier 8 (AB-36…AB-38, AB-45)
 └── feature/SP-9            ← Tier 9 (AB-39…AB-41)
 └── feature/SP-10           ← Tier 10 (AB-42…AB-44)
 └── feature/SP-11           ← Tier 11–12 (AB-46…AB-58) multi-app hub + dashboard v2
```

| Branch | Purpose |
|--------|---------|
| `dev` | Base for all feature branches; receives merges after review |
| `feature/SP-{tier}` | One branch per tier; multiple AB commits |

---

## Workflow

1. **Feature agent** — checkout `dev`, create `feature/SP-{tier}`, implement AB items, one commit each.
2. **Code review agent** — run `./scripts/sp-quality-gate.sh`, manual review, merge to `dev` on PASS.

```bash
npm run quality-gate
```

See [review checklist](../.cursor/skills/sales-portal-code-review-agent/review-checklist.md) for manual review dimensions.

---

## Commit conventions

```
{type}(AB-{nn}): {imperative summary}
```

Merge commit:

```
merge(feature/SP-{tier}): Tier {tier} backlog items
```

---

## Setup

`dev` tracks the monorepo integration line (same as active development HEAD until promoted):

```bash
git fetch origin
git checkout dev
git pull origin dev
git checkout -b feature/SP-1
```
