export type AppFeedbackEntry = {
  id: string;
  source: "platform" | "workspace";
  businessId?: string;
  businessName?: string;
  ownerEmail?: string;
  userId?: string;
  rating?: number;
  recommend?: boolean;
  feedback?: string;
  suggestion?: string;
  submittedAt: string | null;
  appId?: string;
};

export type AppFeedbackSummary = {
  totalCount: number;
  averageRating: number | null;
  recommendRate: number | null;
  ratingDistribution: { rating: number; count: number }[];
  recentFeedback: AppFeedbackEntry[];
};

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "object" && value !== null && "_seconds" in value) {
    return new Date(
      (value as { _seconds: number })._seconds * 1000,
    ).toISOString();
  }
  return null;
}

function readText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function readRating(data: Record<string, unknown>): number | undefined {
  const raw = data.rating ?? data.score ?? data.stars;
  const rating = Number(raw);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return undefined;
  return Math.round(rating);
}

function readRecommend(data: Record<string, unknown>): boolean | undefined {
  const raw = data.recommend ?? data.wouldRecommend ?? data.would_recommend;
  if (typeof raw === "boolean") return raw;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return undefined;
}

export function mapPlatformFeedbackDoc(
  id: string,
  data: Record<string, unknown>,
): AppFeedbackEntry {
  return {
    id: `platform-${id}`,
    source: "platform",
    businessId:
      typeof data.businessId === "string" ? data.businessId : undefined,
    businessName:
      typeof data.businessName === "string" ? data.businessName : undefined,
    ownerEmail: typeof data.email === "string" ? data.email : undefined,
    userId: typeof data.userId === "string" ? data.userId : undefined,
    rating: readRating(data),
    recommend: readRecommend(data),
    feedback: readText(data.feedback, data.comment, data.message, data.text),
    suggestion: readText(
      data.nextUpdateSuggestion,
      data.suggestion,
      data.improvement,
    ),
    submittedAt: toIso(
      data.submittedAt ?? data.createdAt ?? data.timestamp ?? data.updatedAt,
    ),
    appId: typeof data.appId === "string" ? data.appId : undefined,
  };
}

export function mapWorkspaceFeedback(input: {
  businessId: string;
  businessName: string;
  ownerEmail?: string;
  userFeedback: Record<string, unknown>;
}): AppFeedbackEntry {
  const { businessId, businessName, ownerEmail, userFeedback } = input;
  return {
    id: `workspace-${businessId}`,
    source: "workspace",
    businessId,
    businessName,
    ownerEmail,
    rating: readRating(userFeedback),
    recommend: readRecommend(userFeedback),
    feedback: readText(userFeedback.feedback, userFeedback.comment),
    suggestion: readText(
      userFeedback.nextUpdateSuggestion,
      userFeedback.suggestion,
    ),
    submittedAt: toIso(userFeedback.submittedAt ?? userFeedback.createdAt),
    appId: "smartrefill",
  };
}

export function computeAppFeedback(
  entries: AppFeedbackEntry[],
): AppFeedbackSummary {
  const sorted = [...entries].sort((a, b) => {
    const aTime = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const bTime = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return bTime - aTime;
  });

  const ratings = sorted
    .map((entry) => entry.rating)
    .filter((rating): rating is number => rating !== undefined);

  const recommendations = sorted
    .map((entry) => entry.recommend)
    .filter((value): value is boolean => value !== undefined);

  const ratingDistribution = [1, 2, 3, 4, 5].map((rating) => ({
    rating,
    count: ratings.filter((value) => value === rating).length,
  }));

  const averageRating =
    ratings.length > 0 ?
      Math.round(
        (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) *
          10,
      ) / 10 :
      null;

  const recommendRate =
    recommendations.length > 0 ?
      Math.round(
        (recommendations.filter(Boolean).length / recommendations.length) * 100,
      ) :
      null;

  return {
    totalCount: sorted.length,
    averageRating,
    recommendRate,
    ratingDistribution,
    recentFeedback: sorted.slice(0, 12),
  };
}
