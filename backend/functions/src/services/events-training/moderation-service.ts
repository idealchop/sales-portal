import { FieldValue } from "firebase-admin/firestore";
import type {
  CommentAuthorType,
  CommentStatus,
  ContentParentKind,
  QuestionStatus,
} from "../../constants/events-training";
import {
  COMMENT_AUTHOR_TYPES,
  COMMENT_STATUSES,
  QUESTION_STATUSES,
} from "../../constants/events-training";
import { toIsoString } from "../sales-serializer";
import {
  blogCommentsCollection,
  blogsCollection,
  videoEngagementCollection,
  videoEngagementPostsCollection,
  videosCollection,
} from "./events-training-db";

export type CommentRecord = {
  id: string;
  text: string;
  displayName: string | null;
  parentId: string | null;
  authorType: CommentAuthorType;
  userId: string | null;
  status: CommentStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export type QuestionRecord = {
  id: string;
  text: string;
  userId: string;
  displayName: string | null;
  status: QuestionStatus;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ModerationCommentItem = CommentRecord & {
  kind: "comment";
  contentKind: ContentParentKind;
  contentId: string;
  contentTitle: string;
};

export type ModerationQuestionItem = QuestionRecord & {
  kind: "question";
  contentKind: "video";
  contentId: string;
  contentTitle: string;
};

export type ModerationInbox = {
  comments: ModerationCommentItem[];
  questions: ModerationQuestionItem[];
  counts: {
    openQuestions: number;
    flaggedComments: number;
    comments: number;
    questions: number;
  };
};

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ?
    (value as T) :
    fallback;
}

function questionStatusFromPost(data: Record<string, unknown>): QuestionStatus {
  const answer =
    typeof data.answer === "string" && data.answer.trim() ?
      data.answer.trim() :
      null;
  if (answer) return "answered";
  if (data.status === "hidden" || data.status === "closed") return "closed";
  return "open";
}

function mapEngagementComment(
  id: string,
  data: Record<string, unknown>,
): CommentRecord {
  const anonymous = data.anonymous === true;
  return {
    id,
    text: String(data.body ?? data.text ?? ""),
    displayName: anonymous ?
      "Anonymous" :
      typeof data.displayName === "string" ?
        data.displayName :
        null,
    parentId: null,
    authorType: anonymous ?
      "anonymous" :
      parseEnum(data.authorType, COMMENT_AUTHOR_TYPES, "member"),
    userId: typeof data.userId === "string" ? data.userId : null,
    status: parseEnum(data.status, COMMENT_STATUSES, "visible"),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapEngagementQuestion(
  id: string,
  data: Record<string, unknown>,
): QuestionRecord {
  const anonymous = data.anonymous === true;
  const answer =
    typeof data.answer === "string" && data.answer.trim() ?
      data.answer.trim() :
      null;
  return {
    id,
    text: String(data.body ?? data.text ?? ""),
    userId: typeof data.userId === "string" ? data.userId : "",
    displayName: anonymous ?
      "Anonymous" :
      typeof data.displayName === "string" ?
        data.displayName :
        null,
    status: questionStatusFromPost(data),
    answer,
    answeredBy:
      typeof data.answeredByUid === "string" ?
        data.answeredByUid :
        typeof data.answeredBy === "string" ?
          data.answeredBy :
          null,
    answeredAt: toIsoString(data.answeredAt),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

function mapLegacyBlogComment(
  id: string,
  data: Record<string, unknown>,
): CommentRecord {
  return {
    id,
    text: String(data.text ?? data.body ?? ""),
    displayName: typeof data.displayName === "string" ? data.displayName : null,
    parentId: typeof data.parentId === "string" ? data.parentId : null,
    authorType: parseEnum(data.authorType, COMMENT_AUTHOR_TYPES, "anonymous"),
    userId: typeof data.userId === "string" ? data.userId : null,
    status: parseEnum(data.status, COMMENT_STATUSES, "visible"),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]!);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      worker(),
    ),
  );
  return results;
}

async function videoTitleMap(videoIds: string[]): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  await Promise.all(
    [...new Set(videoIds)].map(async (id) => {
      const snap = await videosCollection().doc(id).get();
      if (!snap.exists) {
        titles.set(id, "Untitled video");
        return;
      }
      titles.set(
        id,
        String(snap.data()?.name ?? "").trim() || "Untitled video",
      );
    }),
  );
  return titles;
}

/**
 * SmartRefill member engagement lives under
 * apps/smartrefill/training_video_engagement/{videoId}/posts.
 */
export async function listVideoComments(
  videoId: string,
  options?: { includeHidden?: boolean },
): Promise<CommentRecord[]> {
  const snap = await videoEngagementPostsCollection(videoId)
    .where("kind", "==", "comment")
    .limit(300)
    .get()
    .catch(async () =>
      videoEngagementPostsCollection(videoId).limit(300).get(),
    );

  let items = snap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      if (data.kind && data.kind !== "comment") return null;
      return mapEngagementComment(d.id, data);
    })
    .filter((row): row is CommentRecord => Boolean(row));

  if (!options?.includeHidden) {
    items = items.filter((c) => c.status === "visible");
  }
  return items.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

export async function listBlogComments(
  blogId: string,
  options?: { includeHidden?: boolean },
): Promise<CommentRecord[]> {
  const snap = await blogCommentsCollection(blogId).limit(200).get();
  let items = snap.docs.map((d) =>
    mapLegacyBlogComment(d.id, d.data() as Record<string, unknown>),
  );
  if (!options?.includeHidden) {
    items = items.filter((c) => c.status === "visible");
  }
  return items.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
}

export async function listQuestions(videoId: string): Promise<QuestionRecord[]> {
  const snap = await videoEngagementPostsCollection(videoId)
    .where("kind", "==", "question")
    .limit(300)
    .get()
    .catch(async () =>
      videoEngagementPostsCollection(videoId).limit(300).get(),
    );

  return snap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      if (data.kind && data.kind !== "question") return null;
      return mapEngagementQuestion(d.id, data);
    })
    .filter((row): row is QuestionRecord => Boolean(row))
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function moderateComment(
  kind: ContentParentKind,
  parentId: string,
  commentId: string,
  status: CommentStatus,
): Promise<CommentRecord> {
  if (!(COMMENT_STATUSES as readonly string[]).includes(status)) {
    throw new Error("INVALID_COMMENT_STATUS");
  }

  if (kind === "blog") {
    const parentSnap = await blogsCollection().doc(parentId).get();
    if (!parentSnap.exists) throw new Error("NOT_FOUND");
    const ref = blogCommentsCollection(parentId).doc(commentId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("COMMENT_NOT_FOUND");
    await ref.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updated = await ref.get();
    return mapLegacyBlogComment(updated.id, updated.data() ?? {});
  }

  const parentSnap = await videosCollection().doc(parentId).get();
  if (!parentSnap.exists) throw new Error("NOT_FOUND");
  const ref = videoEngagementPostsCollection(parentId).doc(commentId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("COMMENT_NOT_FOUND");
  const data = snap.data() ?? {};
  if (data.kind && data.kind !== "comment") {
    throw new Error("COMMENT_NOT_FOUND");
  }
  await ref.update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return mapEngagementComment(updated.id, updated.data() ?? {});
}

export async function answerQuestion(
  videoId: string,
  questionId: string,
  input: { answer: string; status?: QuestionStatus; answeredBy: string },
): Promise<QuestionRecord> {
  const trimmed = input.answer.trim();
  if (!trimmed || trimmed.length > 5000) throw new Error("INVALID_ANSWER_TEXT");

  const ref = videoEngagementPostsCollection(videoId).doc(questionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("QUESTION_NOT_FOUND");
  const data = snap.data() ?? {};
  if (data.kind && data.kind !== "question") {
    throw new Error("QUESTION_NOT_FOUND");
  }

  await ref.update({
    answer: trimmed,
    answeredByUid: input.answeredBy,
    answeredBy: input.answeredBy,
    answeredAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return mapEngagementQuestion(updated.id, updated.data() ?? {});
}

export async function setQuestionStatus(
  videoId: string,
  questionId: string,
  status: QuestionStatus,
): Promise<QuestionRecord> {
  if (!(QUESTION_STATUSES as readonly string[]).includes(status)) {
    throw new Error("INVALID_QUESTION_STATUS");
  }
  const ref = videoEngagementPostsCollection(videoId).doc(questionId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("QUESTION_NOT_FOUND");
  const data = snap.data() ?? {};
  if (data.kind && data.kind !== "question") {
    throw new Error("QUESTION_NOT_FOUND");
  }

  // Engagement posts use visible/hidden; map closed → hidden.
  const postStatus = status === "closed" ? "hidden" : "visible";
  await ref.update({
    status: postStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });
  const updated = await ref.get();
  return mapEngagementQuestion(updated.id, updated.data() ?? {});
}

/**
 * Cross-video moderation inbox from SmartRefill training_video_engagement posts.
 * Also merges legacy blog comments when present.
 */
export async function listModerationInbox(): Promise<ModerationInbox> {
  const engagementSnap = await videoEngagementCollection().limit(500).get();
  const videoIds = engagementSnap.docs.map((doc) => doc.id);

  // Always include engagement doc ids even when counters drift.
  const ids =
    videoIds.length > 0 ?
      videoIds :
      (await videosCollection().limit(300).get()).docs.map((d) => d.id);

  const titles = await videoTitleMap(ids);

  const postRows = await mapPool(ids, 8, async (videoId) => {
    const snap = await videoEngagementPostsCollection(videoId).limit(400).get();
    return snap.docs.map((doc) => ({
      videoId,
      id: doc.id,
      data: doc.data() as Record<string, unknown>,
    }));
  });

  const flat = postRows.flat();
  const comments: ModerationCommentItem[] = flat
    .filter((row) => !row.data.kind || row.data.kind === "comment")
    .map((row) => ({
      ...mapEngagementComment(row.id, row.data),
      kind: "comment" as const,
      contentKind: "video" as const,
      contentId: row.videoId,
      contentTitle: titles.get(row.videoId) ?? "Untitled video",
    }))
    .sort((a, b) => {
      const aFlag = a.status === "flagged" ? 0 : 1;
      const bFlag = b.status === "flagged" ? 0 : 1;
      if (aFlag !== bFlag) return aFlag - bFlag;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });

  const questions: ModerationQuestionItem[] = flat
    .filter((row) => row.data.kind === "question")
    .map((row) => ({
      ...mapEngagementQuestion(row.id, row.data),
      kind: "question" as const,
      contentKind: "video" as const,
      contentId: row.videoId,
      contentTitle: titles.get(row.videoId) ?? "Untitled video",
    }))
    .sort((a, b) => {
      const rank = (status: QuestionStatus) =>
        status === "open" ? 0 : status === "answered" ? 1 : 2;
      const byStatus = rank(a.status) - rank(b.status);
      if (byStatus !== 0) return byStatus;
      return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    });

  // Legacy WRS blog comment subcollections (if any).
  const blogsSnap = await blogsCollection().limit(200).get();
  const blogCommentRows = await mapPool(blogsSnap.docs, 6, async (doc) => {
    const items = await listBlogComments(doc.id, { includeHidden: true });
    const title =
      String(doc.data()?.title ?? "").trim() || "Untitled article";
    return items.map(
      (item): ModerationCommentItem => ({
        ...item,
        kind: "comment",
        contentKind: "blog",
        contentId: doc.id,
        contentTitle: title,
      }),
    );
  });
  comments.push(...blogCommentRows.flat());
  comments.sort((a, b) => {
    const aFlag = a.status === "flagged" ? 0 : 1;
    const bFlag = b.status === "flagged" ? 0 : 1;
    if (aFlag !== bFlag) return aFlag - bFlag;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  return {
    comments,
    questions,
    counts: {
      openQuestions: questions.filter((q) => q.status === "open").length,
      flaggedComments: comments.filter((c) => c.status === "flagged").length,
      comments: comments.length,
      questions: questions.length,
    },
  };
}
