# Frontend manual test cases

Manual QA checklist for Sales Portal. Cross-reference automated tests in [testing-test-summary.md](./testing-test-summary.md).

**Environment:** staging or local (`npm run dev:frontend` + `npm run dev:api`)

**Test users:** Prepare Firebase Auth users with `users.appAccess.sales-portal` roles: `sales`, `manager`, `admin`.

---

## TC-AUTH — Authentication

| ID | Role | Steps | Expected |
|----|------|-------|----------|
| TC-AUTH-01 | — | Open `/login` | Login form visible; branding loads |
| TC-AUTH-02 | — | Submit invalid email format | Validation error |
| TC-AUTH-03 | — | Wrong password | Firebase auth error message |
| TC-AUTH-04 | any | Valid user **without** portal access | Clear error; mentions Admin → Permissions |
| TC-AUTH-05 | sales | Valid login, onboarding incomplete | Redirect `/onboarding` |
| TC-AUTH-06 | sales | Valid login, onboarding complete | Redirect `/dashboard` |
| TC-AUTH-07 | admin | Login as admin | Dashboard + Admin + Subscriptions nav visible |
| TC-AUTH-08 | sales | Login as sales | No Admin/Subscriptions nav |

---

## TC-ONB — Onboarding

| ID | Role | Steps | Expected |
|----|------|-------|----------|
| TC-ONB-01 | sales | Complete setup with team | Profile saved; lands on dashboard |
| TC-ONB-02 | manager | Complete setup with location | Location saved on `sales/{uid}` |
| TC-ONB-03 | sales | Skip required field | 400 validation from API |

---

## TC-DASH — Dashboard

| ID | Role | Steps | Expected |
|----|------|-------|----------|
| TC-DASH-01 | any | Open `/dashboard` | Metrics load; no console errors |
| TC-DASH-02 | any | Change date range filter | Charts/metrics update |
| TC-DASH-03 | any | Open metric breakdown dialog | Breakdown rows render |
| TC-DASH-04 | any | Business locations map | Pins load for businesses with coords |
| TC-DASH-05 | admin | Approve pending subscription | Approval succeeds; UI refreshes |
| TC-DASH-06 | any | Open `/dashboard/smartrefill` | Product KPIs, map, usage charts, insights/forecast tabs |
| TC-DASH-07 | any | Open `/dashboard/sales-portal` | Personal KPIs, actions/joiners tabs, revenue charts |
| TC-DASH-08 | any | Platform hub Actions \| Forecast tabs | Paginated forecast rows; actions inbox |
| TC-DASH-09 | admin | Subscription approval **View** | Detail dialog + receipt/attachment preview |
| TC-DASH-10 | admin | Active owners list | Top 5 rows; pending before at-risk before healthy |
| TC-DASH-11 | any | Subscription list **Print OR** | Paid history row opens Official Receipt PDF / print dialog |
| TC-DASH-12 | any | Subscription list **Print statement** | SOA PDF lists all paid periods for that business |

---

## TC-CS — Content Studio

| ID | Role | Steps | Expected |
|----|------|-------|----------|
| TC-CS-01 | sales | Open `/content-studio` | Form renders |
| TC-CS-02 | sales | Generate post (with Gemini configured) | Caption + image returned |
| TC-CS-03 | sales | Generate without API key (local) | Clear configuration error |

---

## TC-ET — Events & Training (manager/admin)

| ID | Role | Steps | Expected |
|----|------|-------|----------|
| TC-ET-01 | manager | Open `/events-training` | Overview shows analytics + attention cards |
| TC-ET-02 | manager | Create video with YouTube embed paste | Saves normalized embed URL; thumbnail optional |
| TC-ET-02b | manager | Open `/events-training/tutorials` and create tutorial | Saves with category `tutorial`; list scoped to tutorials |
| TC-ET-02c | manager | Search / filter / page tutorials list | Status chips, app/provider filters, rows control, and pagination work |
| TC-ET-03 | manager | Set video visibility `premium` without price | Validation error — price required |
| TC-ET-04 | manager | Set visibility `private` + select plans / all members | Saves access rules |
| TC-ET-05 | manager | `/events-training/registrations` accept pending | Status accepted; join link when available |
| TC-ET-05b | manager | Delete a registration (confirm dialog) | Row removed; count adjusted for pending/accepted |
| TC-ET-06 | manager | `/events-training/schedules` open published webinar automation | Email timeline shown; Meta channels absent |
| TC-ET-07 | manager | `/events-training/moderation` hide comment | Comment status `hidden` |
| TC-ET-07b | manager | Delete comment / question (confirm dialog) | Item removed from inbox |
| TC-ET-08 | manager | `/events-training/certifications` issue + revoke | Issued then revoked |
| TC-ET-09 | manager | `/events-training/analytics` period 30 | Summary cards load |
| TC-ET-10 | sales | Navigate to `/events-training` | Nav hidden or redirected |

---

## TC-SUB — Subscriptions catalog (admin)

| ID | Role | Steps | Expected |
|----|------|-------|----------|
| TC-SUB-01 | admin | Open `/subscriptions/plans` | Plan list loads |
| TC-SUB-02 | admin | Add plan via form | Document created in Firestore |
| TC-SUB-03 | admin | Edit plan limitations | All limitation fields persist |
| TC-SUB-04 | admin | Click table row | Detail dialog opens |
| TC-SUB-05 | admin | `/subscriptions/addons` CRUD | Addons list + forms work |
| TC-SUB-06 | admin | `/subscriptions/vouchers-affiliates` | Vouchers/affiliates CRUD works |
| TC-SUB-07 | sales | Navigate to `/subscriptions` | Blocked or nav hidden |

---

## TC-ADM — Admin

| ID | Role | Steps | Expected |
|----|------|-------|----------|
| TC-ADM-01 | admin | `/admin/permissions` — grant access | User can log in |
| TC-ADM-02 | admin | Revoke access | User blocked at login |
| TC-ADM-03 | admin | `/admin/data-management` — browse business | Subcollections load |
| TC-ADM-04 | admin | Edit Firestore document | Save persists |
| TC-ADM-05 | admin | Delete document | Confirm + remove |

---

## TC-NAV — Navigation & maintenance

| ID | Role | Steps | Expected |
|----|------|-------|----------|
| TC-NAV-01 | sales | Click maintenance nav item (Proposals) | Maintenance page shown |
| TC-NAV-02 | admin | Subscriptions collapsible nav | Child routes reachable |
| TC-NAV-03 | mobile | 320px viewport — sidebar | Usable on mobile width |

---

## TC-NEG — Negative / edge

| ID | Steps | Expected |
|----|-------|----------|
| TC-NEG-01 | Call API without token | 401 |
| TC-NEG-02 | Sales user calls `/admin/users` | 403 |
| TC-NEG-03 | Expired session refresh | Redirect login |

---

## Sign-off template

| Area | Tester | Date | Pass/Fail | Notes |
|------|--------|------|-----------|-------|
| Auth | | | | |
| Dashboard | | | | |
| Content Studio | | | | |
| Subscriptions | | | | |
| Admin | | | | |
