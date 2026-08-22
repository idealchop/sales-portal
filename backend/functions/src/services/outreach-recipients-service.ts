import { db } from "../config/firebase-admin";
import {
  appLabelForId,
  listClientDirectory,
  listClients,
  type ClientAppAccess,
} from "./clients-service";
import type { SalesActor } from "./sales-scope";
import { listRegistrations } from "./events-training/registrations-service";
import {
  blogsCollection,
  registrationsCollection,
  videoEngagementCollection,
  videoEngagementPostsCollection,
  webinarsCollection,
} from "./events-training/events-training-db";

export type OutreachRecipientSource =
  | "platform_user"
  | "crm_client"
  | "webinar_guest"
  | "webinar_member"
  | "story_engagement"
  | "article_engagement";

export type OutreachRecipient = {
  id: string;
  email: string;
  displayName: string;
  companyName?: string;
  source: OutreachRecipientSource;
  sourceLabel: string;
  appId?: string;
  appLabel?: string;
  apps?: ClientAppAccess[];
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.includes("@") && trimmed.includes(".");
}

/** Merges a recipient into the map by normalized email (exported for unit tests). */
export function mergeOutreachRecipient(
  map: Map<string, OutreachRecipient>,
  entry: OutreachRecipient,
): void {
  const key = normalizeEmail(entry.email);
  if (!isValidEmail(key)) return;
  const existing = map.get(key);
  if (!existing) {
    map.set(key, entry);
    return;
  }
  const apps = [...(existing.apps ?? []), ...(entry.apps ?? [])];
  const byApp = new Map<string, ClientAppAccess>();
  for (const app of apps) {
    byApp.set(app.appId, app);
  }
  map.set(key, {
    ...existing,
    displayName: existing.displayName || entry.displayName,
    companyName: existing.companyName || entry.companyName,
    apps: [...byApp.values()],
    sourceLabel:
      existing.sourceLabel === entry.sourceLabel ?
        existing.sourceLabel :
        `${existing.sourceLabel}; ${entry.sourceLabel}`,
  });
}

async function loadUserEmails(
  userIds: string[],
): Promise<Map<string, { email?: string; displayName?: string }>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, { email?: string; displayName?: string }>();
  if (unique.length === 0) return out;

  const snaps = await Promise.all(
    unique.map((uid) => db.collection("users").doc(uid).get()),
  );
  for (const snap of snaps) {
    if (!snap.exists) continue;
    const data = snap.data() ?? {};
    const email =
      typeof data.email === "string" && data.email.trim() ?
        data.email.trim() :
        undefined;
    const displayName =
      typeof data.displayName === "string" && data.displayName.trim() ?
        data.displayName.trim() :
        typeof data.fullName === "string" && data.fullName.trim() ?
          data.fullName.trim() :
          undefined;
    out.set(snap.id, { email, displayName });
  }
  return out;
}

async function webinarMetaById(): Promise<
  Map<string, { title: string; appId?: string }>
  > {
  const snap = await webinarsCollection().get();
  const map = new Map<string, { title: string; appId?: string }>();
  for (const doc of snap.docs) {
    const data = doc.data();
    const title =
      typeof data.name === "string" && data.name.trim() ?
        data.name.trim() :
        "Webinar";
    const appId =
      typeof data.appId === "string" && data.appId.trim() ?
        data.appId.trim() :
        undefined;
    map.set(doc.id, { title, appId });
  }
  return map;
}

async function collectEngagementMemberEmails(
  source: "story_engagement" | "article_engagement",
  labelPrefix: string,
): Promise<OutreachRecipient[]> {
  const engagementSnap =
    source === "story_engagement" ?
      await videoEngagementCollection().limit(200).get() :
      null;
  const userIds: string[] = [];
  const metaByUser = new Map<
    string,
    { contentTitle: string; appId?: string }
  >();

  if (engagementSnap) {
    for (const engDoc of engagementSnap.docs) {
      const postsSnap = await videoEngagementPostsCollection(engDoc.id)
        .limit(80)
        .get();
      for (const post of postsSnap.docs) {
        const data = post.data();
        if (data.anonymous === true) continue;
        const userId =
          typeof data.userId === "string" && data.userId.trim() ?
            data.userId.trim() :
            null;
        if (!userId) continue;
        userIds.push(userId);
        if (!metaByUser.has(userId)) {
          metaByUser.set(userId, {
            contentTitle: labelPrefix,
            appId: "smartrefill",
          });
        }
      }
    }
  }

  if (source === "article_engagement") {
    const blogsSnap = await blogsCollection().limit(100).get();
    for (const blog of blogsSnap.docs) {
      const title =
        typeof blog.data().title === "string" ?
          String(blog.data().title).trim() :
          "Article";
      const commentsSnap = await blog.ref
        .collection("comments")
        .limit(50)
        .get();
      for (const comment of commentsSnap.docs) {
        const data = comment.data();
        const userId =
          typeof data.userId === "string" && data.userId.trim() ?
            data.userId.trim() :
            null;
        if (!userId) continue;
        userIds.push(userId);
        metaByUser.set(userId, {
          contentTitle: title,
          appId:
            typeof blog.data().appId === "string" ?
              String(blog.data().appId).trim() :
              "smartrefill",
        });
      }
    }
  }

  const users = await loadUserEmails(userIds);
  const recipients: OutreachRecipient[] = [];
  for (const [userId, meta] of metaByUser.entries()) {
    const user = users.get(userId);
    if (!user?.email || !isValidEmail(user.email)) continue;
    const appId = meta.appId ?? "smartrefill";
    recipients.push({
      id: `${source}:${userId}`,
      email: user.email,
      displayName: user.displayName || user.email,
      source,
      sourceLabel: `${labelPrefix} · ${meta.contentTitle}`,
      appId,
      appLabel: appLabelForId(appId),
      apps: [{ appId, label: appLabelForId(appId) }],
    });
  }
  return recipients;
}

export async function listOutreachRecipients(
  actor: SalesActor,
): Promise<OutreachRecipient[]> {
  const map = new Map<string, OutreachRecipient>();

  const [directory, clients, registrations, webinarMeta] = await Promise.all([
    listClientDirectory(actor),
    listClients(actor),
    listRegistrations(),
    webinarMetaById(),
  ]);

  for (const entry of directory) {
    if (!entry.email || !isValidEmail(entry.email)) continue;
    mergeOutreachRecipient(map, {
      id: `platform:${entry.linkedUserId}`,
      email: entry.email,
      displayName: entry.displayName,
      companyName: entry.companyName,
      source: "platform_user",
      sourceLabel: "Platform user",
      apps: entry.apps,
      appId: entry.apps[0]?.appId,
      appLabel: entry.apps[0]?.label,
    });
  }

  for (const client of clients) {
    const email = client.contactEmail?.trim() || "";
    if (!isValidEmail(email)) continue;
    const apps = client.apps ?? [];
    mergeOutreachRecipient(map, {
      id: `client:${client.id}`,
      email,
      displayName: client.contactName || client.companyName || email,
      companyName: client.companyName,
      source: "crm_client",
      sourceLabel: "CRM client / prospect",
      appId: apps[0]?.appId,
      appLabel: apps[0]?.label,
      apps,
    });
  }

  for (const reg of registrations) {
    if (!reg.email || !isValidEmail(reg.email)) continue;
    const webinar = webinarMeta.get(reg.eventId);
    const appId = webinar?.appId ?? "smartrefill";
    const webinarTitle = webinar?.title ?? "Webinar";
    const source: OutreachRecipientSource =
      reg.kind === "guest" ? "webinar_guest" : "webinar_member";
    mergeOutreachRecipient(map, {
      id: `webinar:${reg.id}`,
      email: reg.email,
      displayName: reg.displayName || reg.email,
      source,
      sourceLabel:
        source === "webinar_guest" ?
          `Webinar guest · ${webinarTitle}` :
          `Webinar member · ${webinarTitle}`,
      appId,
      appLabel: appLabelForId(appId),
      apps: [{ appId, label: appLabelForId(appId) }],
    });
  }

  const [storyRecipients, articleRecipients] = await Promise.all([
    collectEngagementMemberEmails("story_engagement", "WRS story"),
    collectEngagementMemberEmails("article_engagement", "Article"),
  ]);
  for (const entry of [...storyRecipients, ...articleRecipients]) {
    mergeOutreachRecipient(map, entry);
  }

  return [...map.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {
      sensitivity: "base",
    }),
  );
}
