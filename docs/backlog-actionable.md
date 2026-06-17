# Sales Portal — Actionable Backlog

Implementation-ready work ordered by ROI × ease. IDs: **AB-01** … **AB-24**.

**Agent workflow:** [`agent-workflow.md`](./agent-workflow.md) · Skills: `sales-portal-feature-agent`, `sales-portal-code-review-agent`

---

## Tier 1 — Ship this week ✅ (feature/SP-1)

| ID | Item | Status |
|----|------|--------|
| AB-01 | Coming soon badge on maintenance nav | ✅ Shipped |
| AB-02 | Wire Sales Insights panel | ✅ Shipped |
| AB-03 | Platform analytics naming | ✅ Shipped |
| AB-04 | Read-only settings profile | ✅ Shipped |
| AB-05 | Remove legacy Firestore hooks | ✅ Shipped |
| AB-06 | Platform docs + route status | ✅ Shipped |

## Tier 2 — Foundation ✅ (feature/SP-2)

| ID | Item | Status |
|----|------|--------|
| AB-07 | Auth integration tests | ✅ Shipped |
| AB-08 | Emulator seed users | ✅ Shipped |
| AB-09 | Dashboard BDD smoke + auth API BDD | ✅ Shipped |
| AB-10 | Backend route docs | ✅ Shipped |
| AB-11 | Chart screen-reader summaries | ✅ Shipped |

## Tier 3 — Sales workflow MVP ✅ (feature/SP-3)

| ID | Item | Status |
|----|------|--------|
| AB-12 | Sales workflow BFF API | ✅ Shipped |
| AB-13 | Proposals list page | ✅ Shipped |
| AB-14 | Clients list hook + tab | ✅ Shipped |
| AB-15 | Create proposal wizard | ✅ Shipped |
| AB-16 | Shareable public proposal links | ✅ Shipped |
| AB-17 | Commissions list + payout view | ✅ Shipped |
| AB-18 | Manager My Team page | ✅ Shipped |
| AB-19 | Sales materials library | ✅ Shipped |

## Tier 4 — Admin & polish ✅ (feature/SP-4)

| ID | Item | Status |
|----|------|--------|
| AB-20 | Subscription approval queue | ✅ Shipped |
| AB-21 | Admin bulk delete API wiring | ✅ Shipped |
| AB-22 | Dashboard mobile nav polish | ✅ Shipped |
| AB-23 | AI sales insights card | ✅ Shipped |
| AB-24 | Tier 4 BDD specs | ✅ Shipped |

## Tier 5 — Onboarding visibility ✅ (feature/SP-4)

| ID | Item | Status |
|----|------|--------|
| AB-25 | New joiners panel (sales reps, businesses, platform users) | ✅ Shipped |

## Tier 6 — Access control & contracts ✅ (feature/SP-5)

| ID | Item | Status |
|----|------|--------|
| AB-26 | Revoke access quick action (dashboard + admin permissions) | ✅ Shipped |
| AB-27 | newJoiners analytics BDD + role filter unit tests | ✅ Shipped |
| AB-28 | Frontend analytics normalize test for newJoiners | ✅ Shipped |

## Tier 7 — Dashboard revamp & UX polish (feature/SP-6)

| ID | Item | Status |
|----|------|--------|
| AB-29 | Role-based dashboard header + refresh + data-as-of timestamp | ✅ Shipped |
| AB-30 | Platform snapshot KPI strip + top workspaces leaderboard | ✅ Shipped |
| AB-31 | Reorder dashboard — actions & intelligence before deep charts | ✅ Shipped |
| AB-32 | Tabbed account insights (priority, churn, growth, re-engage) | ✅ Shipped |
| AB-33 | Role-aware sections (approvals, product feedback) | ✅ Shipped |
| AB-34 | Unified workspace health labels + email outreach on action queue | ✅ Shipped |
| AB-35 | Clearer metric section titles and 30-day context copy | ✅ Shipped |

## Tier 8 — Sales scope & command center ✅ (feature/SP-8)

| ID | Item | Status |
|----|------|--------|
| AB-36 | Role-scoped dashboard API (territory/rep filtering) | ✅ Shipped |
| AB-37 | Single “Today’s work” inbox (dedupe AI + sales actions + approvals) | ✅ Shipped |
| AB-38 | Rep-centric home strip (my pipeline, commissions MTD, win rate) | ✅ Shipped |
| AB-45 | Lightweight `/dashboard/sales-home` endpoint for rep-focused payload | ✅ Shipped |

## Tier 9 — Sales workflow pages ✅ (feature/SP-9)

| ID | Item | Status |
|----|------|--------|
| AB-39 | Proposals page revamp — pipeline funnel, aging, quick actions | ✅ Shipped |
| AB-40 | Commissions page revamp — payout forecast, status filters, export | ✅ Shipped |
| AB-41 | My Team manager view — rep activity, quota progress, coaching cues | ✅ Shipped |

## Tier 10 — Platform polish ✅ (feature/SP-10)

| ID | Item | Status |
|----|------|--------|
| AB-42 | Content Studio polish — templates, history, brand presets | ✅ Shipped |
| AB-43 | Admin/subscriptions UX pass — catalog search, bulk ops, empty states | ✅ Shipped |
| AB-44 | Global date filter driving KPIs + charts consistently | ✅ Shipped |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | Initial backlog created |
| 2026-06-17 | Tier 1 (AB-01–AB-06) shipped on `feature/SP-1` |
| 2026-06-17 | Tier 2 (AB-07–AB-11) shipped on `feature/SP-2` |
| 2026-06-17 | Tier 3 (AB-12–AB-19) shipped on `feature/SP-3` |
| 2026-06-17 | Tier 4 (AB-20–AB-24) shipped on `feature/SP-4` |
| 2026-06-17 | AB-25 new joiners panel + analytics crash fixes on `feature/SP-4` |
| 2026-06-17 | Tier 6 (AB-26–AB-28) shipped on `feature/SP-5` |
| 2026-06-17 | Tier 7 dashboard revamp (AB-29–AB-35) shipped on `feature/SP-6` |
| 2026-06-17 | Tier 8 (AB-36–38, AB-45) shipped on `feature/SP-8` |
| 2026-06-17 | Tier 9 (AB-39–AB-41) shipped on `feature/SP-9` |
| 2026-06-17 | Tier 10 (AB-42–AB-44) shipped on `feature/SP-10` |
