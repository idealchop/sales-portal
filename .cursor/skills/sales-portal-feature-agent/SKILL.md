---
name: sales-portal-feature-agent
description: >-
  Implements Sales Portal actionable backlog items (AB-01…AB-24) on tier feature
  branches feature/SP-{tier}. Creates branch from dev, one commit per AB item,
  updates backlog changelog. Use when implementing backlog items, Tier work,
  AB-XX, or feature/SP branches for sales-portal.
---

# Sales Portal — Feature implementation agent

Implements items from [`docs/backlog-actionable.md`](../../../docs/backlog-actionable.md) on tier-scoped feature branches.

**Base branch:** `dev` · **Feature branch:** `feature/SP-{tier}` · **Review:** `sales-portal-code-review-agent`

## Branch workflow

1. `git checkout dev && git pull origin dev`
2. `git checkout -b feature/SP-{tier}` (or continue existing)
3. Implement one AB at a time; run `npm run lint && npm run test:unit`
4. **One commit per AB:** `feat(AB-01): …`
5. Update `docs/backlog-actionable.md` changelog
6. Hand off to code review agent — do not merge

## Tier map

| Tier | Branch | AB range |
|------|--------|----------|
| 1 | `feature/SP-1` | AB-01 … AB-06 |
| 2 | `feature/SP-2` | AB-07 … AB-11 |
| 3 | `feature/SP-3` | AB-12 … AB-19 |
| 4 | `feature/SP-4` | AB-20 … AB-24 |
| 5 | `feature/SP-4` | AB-25 |
| 6 | `feature/SP-5` | AB-26 … AB-28 |

See [`docs/agent-workflow.md`](../../../docs/agent-workflow.md) for full workflow.
