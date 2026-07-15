# Events & Training (Sales Portal)

Sales Portal CMS and ops for Smart Refill Resources content and webinar event management.

**Shared Firestore:** `apps/smartrefill/*` on `riverdb`  
**Auth:** Bearer + `appAccess.sales-portal` + **manager or admin** role  
**Feature folder:** `frontend/src/features/events-training/`  
**API module:** `backend/functions/src/routes/events-training-routes.ts`

---

## UI routes

Information architecture (compact tab bar + sidebar): **Overview → Needs attention → Create & manage → Settings**.

| Group | Route | Purpose |
|-------|-------|---------|
| Overview | `/events-training` | Landing — registration + moderation to-dos, charts, and breakdowns |
| Overview | `/events-training/analytics` | Same analytics panel (deep-link / focused view) |
| Needs attention | `/events-training/registrations` | Registrant queue — accept / decline |
| Needs attention | `/events-training/moderation` | Comment moderate + Q&A answer |
| Create & manage | `/events-training/webinars` | Live webinar events CRUD (+ publish `appId` from `apps`, link recording) |
| Create & manage | `/events-training/videos` | Stories + webinar recordings (publish `appId` from `apps`, visibility, pricing) |
| Create & manage | `/events-training/blogs` | Articles (WRS Blog) — status, visibility, publish `appId`, live HTML preview → `/resources/blogs` |
| Create & manage | `/events-training/tutorials` | Video tutorials CMS — App picker (`GET /events-training/apps`); pages from `apps/{id}.tutorialPages` or defaults |
| Create & manage | `/events-training/certifications` | Webinar certificate templates (enable for attendees; optional manual issue) |
| Settings | `/events-training/schedules` | Automated Meta + email promotion plan (installed on webinar publish) |

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
| `POST` | `/registrations/:id/attendance` | Set `attended` \| `no_show` \| `cleared` (attended auto-issues cert when template enabled) |

**CMS UX:** **To do** lists pending sign-ups across webinars with search, per-row Accept/Decline, and bulk Accept/Decline selected. Accepted rows expose join-link open/copy.

### Schedules (automated promotions)

Publishing a webinar **installs an automation plan** (no manual posting):

| When | Meta community | Email members |
|------|----------------|---------------|
| On publish | Yes | Yes (all members) |
| Weekly until event | Yes | Yes |
| 7 days before | Yes | Yes |
| 3 days before | Yes | Yes |
| 2 days before | Yes | — |
| 1 day before | Yes | Yes |
| 1 hour before | Yes | Yes (registrants) |
| On-going (at start) | Yes | Yes (registrants) |

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/webinars/:id/automation` | View installed plan + next/last run |
| `POST` | `/webinars/:id/automation/install` | Install/refresh plan (`fireImmediate` queues publish Meta+email) |
| `PUT` | `/webinars/:id/automation` | Pause / resume all automated milestones |
| `POST` | `/webinars/:id/automation/preview` | Preview composed copy for a milestone |
| `GET/POST/PATCH/DELETE` | `/schedules` | Low-level schedule rows (auto milestones use `automated: true`) |

Messages include poster, details, Smart Refill register URL, seats left, and certificate.

**Delivery (Cloud Scheduler job `eventsTrainingPromotionDelivery`, every 5 minutes):**

1. Fire due rows in `events_training_schedules` → enqueue Meta captions (+ email queue docs)
2. Publish `meta_post_log` docs with `status: queued` to the community Facebook Page via Graph API (`/{page-id}/feed` or `/photos`)

Requires Secret Manager: `META_COMMUNITY_PAGE_ACCESS_TOKEN` + `META_COMMUNITY_PAGE_ID` (shared with SmartRefill; token needs `pages_manage_posts`). Email queue docs are written for a future Brevo sender; Meta Page publish is live once secrets are bound.

### Moderation

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/moderation/inbox` | Cross-content queue: all video/blog comments + video Q&A (with parent titles) |
| `GET/PATCH` | `/videos/:id/comments` · `/comments/:commentId` | List / set `visible` \| `hidden` \| `flagged` |
| `GET/PATCH` | `/blogs/:id/comments` · `/comments/:commentId` | Same for blogs |
| `GET/PATCH` | `/videos/:id/questions` · `/questions/:questionId` | List / answer / status |

**CMS UX:** Default **To do** lists unanswered member questions + flagged comments from every video (SmartRefill `training_video_engagement/.../posts`). **All comments** / **All questions** browse the full queues — no per-video picker.

### Certifications & analytics

| Method | Path | Purpose |
|--------|------|---------|
| `GET/POST` | `/certifications` | List / manually issue webinar certificates (`targetType` is always `webinar_event`) |
| `POST` | `/certifications/preview` | SVG preview (webinar name, speaker, event date) |
| `POST` | `/certifications/:certId/revoke` | Revoke |
| `PUT` | `/webinars/:webinarId/certificate-template` | Enable / disable `certificationEnabled` for attendee claims |

Certificates are **webinar-only templates**: pick a webinar; the SVG shows webinar name, speaker, and when it happened (from `startsAt`), plus branding for a Firestore `apps/{appId}`. Enabling the template sets `certificationEnabled`. When ops mark a registrant **Attended** (or a member joins / finishes the linked recording), a certificate is **issued automatically** into `training_certifications` and synced to the member’s `webinar_certificates` claim. Manual issue still uploads SVG to Storage as `certificateUrl`.
| `GET` | `/analytics?periodDays=` | Summary + series/breakdowns + rankings (top views, comments, unlocks, regs by webinar; clamp 1–90) |

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
| `appId` | e.g. `smartrefill` | Publish target from Firestore `apps` (stories, recordings, webinars, tutorials) |
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
