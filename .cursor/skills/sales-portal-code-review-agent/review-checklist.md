# Code review checklist

## Automated (required)

```bash
npm run quality-gate
```

## Manual

- Scope matches AB items; no unrelated changes
- No secrets in diff; auth on new routes
- BFF pattern (no client Firestore for business data)
- ESLint + tests pass; docs updated
- `npm audit` — no new high/critical

## Verdict

**PASS** = gate green + zero blockers → merge to `dev`  
**FAIL** = fix on feature branch and re-review
