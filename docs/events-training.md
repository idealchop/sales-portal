# Events & Training (Sales Portal)

Sales Portal CMS and ops for Smart Refill Resources content and webinar event management.

**Shared Firestore:** `apps/smartrefill/*` on `riverdb`  
**Auth:** Bearer + `appAccess.sales-portal` + **manager or admin** role  
**Feature folder:** `frontend/src/features/events-training/`  
**API module:** `backend/functions/src/routes/events-training-routes.ts`

---

## UI routes

### Content (Phases 1–2 CMS)

| Route | Purpose |
|-------|---------|
| `/events-training/blogs` | WRS Blog articles CMS → `/resources/blogs` |
| `/events-training/videos` | WRS Stories + webinar recordings (URL/embed, visibility, pricing) |
| `/events-training/tutorials` | Video tutorials CMS — App picker looks up Firestore `apps` (`GET /events-training/apps`); multi-select **Pages** from `apps/{id}.tutorialPages` or Smart Refill defaults |
| `/events-training/webinars` | Live webinar events CRUD |

### Ops (Phases 3–8 — Sales Portal scope)

| Phase | Route | Purpose |
|-------|-------|---------|
| 3 / 6 | `/events-training/registrations` | Registrant queue — accept / decline / delete |
| 5 | `/events-training/schedules` | Automated email promotion plan |
| 6 | `/events-training/moderation` | Comment/Q&A moderate, answer, delete |
| 7 | `/events-training/certifications` | Issue / revoke / list certificates |
| 8 | `/events-training/analytics` | 7 / 30 / 90-day summary |

Member registration, PayMongo premium unlock, private quotas, Brevo email delivery, notification job runners, and public Resources landings live in **SmartRefill** (not this repo).

---

## API (`/events-training`)

### Content

| Method | Path | Purpose |
|--------|------|---------|
| `GET/POST/PATCH/DELETE` | `/webinars` | Live event CRUD |
| `GET/POST/PATCH/DELETE` | `/videos` | Training video CRUD. Identity via `category`: `wrs_stories` \| `webinar` \| **`tutorial`**. List filter: `?category=tutorial`. First publish fans out SmartRefill owner activity feed + verified-email Brevo (tutorials and WRS Stories / webinar recordings). |
| `GET/POST/PATCH/DELETE` | `/blogs` | WRS blog CMS |
| `POST` | `/upload` | Poster / thumbnail / blog-hero image upload |

**CMS UX:** Capacity, **Auto-accept registrations**, join link, premium price (`unlockPrice` synced from price). Registrant dialog can mark **Attended** / **No-show**.

### Registrations

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/registrations?eventId&status` | List registrants |
| `GET` | `/webinars/:webinarId/registrations` | Registrants for one event |
| `POST` | `/registrations/:id/accept` | Accept (+ capacity check) |
| `POST` | `/registrations/:id/decline` | Decline |
| `DELETE` | `/registrations/:id` | Permanently delete sign-up (adjusts `registrationCount` for pending/accepted) |
| `POST` | `/registrations/:id/attendance` | Set `attended` \| `no_show` \| `cleared` |

**CMS UX:** **To do** lists pending sign-ups across webinars with search, per-row Accept/Decline/Delete, and bulk Accept/Decline selected. Accepted / declined / cancelled rows expose Delete. Destructive actions use an in-app confirm dialog (not `window.confirm`). Accepted rows expose join-link open/copy.

### Schedules (automated promotions)

Publishing a webinar **installs an email automation plan**:

| When | Email |
|------|-------|
| On publish | Yes (all members) |
| Weekly until event | Yes |
| 7 / 3 / 1 days before | Yes |
| 1 hour before | Yes (registrants) |
| On-going (at start) | Yes (registrants) |

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/webinars/:id/automation` | View installed plan |
| `POST` | `/webinars/:id/automation/install` | Install/refresh (`fireImmediate` queues publish email) |
| `PUT` | `/webinars/:id/automation` | Pause / resume |
| `POST` | `/webinars/:id/automation/preview` | Preview email copy |
| `GET/POST/PATCH/DELETE` | `/schedules` | Low-level schedule rows |

Jobs land in `events_training_email_queue`. Scheduler `eventsTrainingPromotionDelivery` (every 5 minutes) fires due milestones.

### Moderation

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/moderation/inbox` | Cross-content queue: all video/blog comments + video Q&A (with parent titles) |
| `GET/PATCH/DELETE` | `/videos/:id/comments` · `/comments/:commentId` | List / set `visible` \| `hidden` \| `flagged` / permanently delete |
| `GET/PATCH/DELETE` | `/blogs/:id/comments` · `/comments/:commentId` | Same for blogs |
| `GET/PATCH/DELETE` | `/videos/:id/questions` · `/questions/:questionId` | List / answer / status / permanently delete |

**CMS UX:** Default **To do** lists unanswered member questions + flagged comments from every video (SmartRefill `training_video_engagement/.../posts`). **All comments** / **All questions** browse the full queues — no per-video picker. Delete removes engagement posts (or blog comment docs) and uses the shared confirm dialog.

### Certifications & analytics

| Method | Path | Purpose |
|--------|------|---------|
| `GET/POST` | `/certifications` | List / issue |
| `POST` | `/certifications/:certId/revoke` | Revoke |
| `GET` | `/analytics?periodDays=` | Summary (clamp 1–90) |

---

## Video visibility (Sales Portal)

| Value | Behavior |
|-------|----------|
| `public` | Anyone can watch; price/plans cleared |
| `premium` | **Price (PHP) required** (`priceCents` > 0) |
| `private` | Choose who can view: **All** members, **Paid member** (Grow/Pro + Scale), or **Scale member** (`allowAllMembers` / `allowedPlanCodes`). Live webinars use the same presets under **Visibility**, plus **Premium** (PHP). |

Legacy Firestore values `members` / `subscription` normalize to `private` on read.

Playback supports watch/share URLs and pasted YouTube `<iframe>` embed HTML (src extracted on save).

### Shareable Resources links

Stories and webinar recordings get a deep link you can copy/share from the CMS (edit dialog, detail view, or list **Link**):

`{NEXT_PUBLIC_SMARTREFILL_APP_URL}/resources/wrs-stories?video={id}`  
(or `/resources/webinars?video={id}` for recordings)

Default origin is `https://app.smartrefill.io`. Guests can open **Public + published** videos; Private/Premium still share the same URL but require the usual Smart Refill access rules.

---

## Firestore collections (`apps/smartrefill/`)

| Collection | Used by |
|------------|---------|
| `webinar_events` | Webinar CRUD |
| `training_videos` | Video CRUD (+ `comments` / `questions` subcollections) |
| `wrs_blogs` | Blog CMS (+ `comments` subcollection) |
| `webinar_registrations` | Registration ops |
| `events_training_schedules` | Notification schedules |
| `training_certifications` | Cert issue/revoke |
| `video_purchases` | Analytics revenue (writes from SmartRefill) |

### `training_videos` identity

| Field | Values | Notes |
|-------|--------|-------|
| **`category`** | `wrs_stories` \| `webinar` \| **`tutorial`** | **Discriminator** — video tutorials always persist `category: "tutorial"` |
| `appId` | e.g. `smartrefill` | Required for tutorials (target app from `apps` collection) |
| `appPages` | string[] | Required for tutorials (pages within that app) |
| `status` | `draft` \| `published` \| `archived` | Tutorials list query: `category == tutorial` |

Filter tutorials: `GET /events-training/videos?category=tutorial` or Firestore `where('category','==','tutorial')`.

Composite indexes for registrations / certifications / schedules live in the **canonical** `smartrefill/frontend/firestore.indexes.json` (synced into `sales-portal/backend` on deploy). Deploy with `DEPLOY_FIRESTORE=1`.

---

## Testing

| Layer | Location |
|-------|----------|
| Unit | `backend/functions/src/__tests__/unit/services/events-training-*.unit.test.ts` |
| Manual | Manager/admin open each `/events-training/*` tab; accept a registrant; issue a cert; load analytics |

```bash
npm run test:unit:backend -- --run src/__tests__/unit/services/events-training
```

---

## Deploy

```bash
# API (includes unit/integration/BDD gates in deploy.sh)
cd backend && ./deploy.sh

# Also deploy Firestore indexes used by registration/cert queries
cd backend && DEPLOY_FIRESTORE=1 ./deploy.sh

# Frontend (App Hosting / hosting target)
npm run deploy:hosting   # from repo root, if publishing UI
```
