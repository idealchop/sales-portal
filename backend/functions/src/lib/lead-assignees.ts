/**
 * Multi-assignee helpers for leads.
 * Canonical field: `assignedToUids: string[]`
 * Legacy `assignedToUid` is kept as the first assignee (or omitted when empty).
 */

export function normalizeAssigneeUids(input: unknown): string[] {
  if (Array.isArray(input)) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of input) {
      if (typeof item !== "string") continue;
      const uid = item.trim();
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      out.push(uid);
    }
    return out;
  }
  if (typeof input === "string") {
    const uid = input.trim();
    return uid ? [uid] : [];
  }
  return [];
}

/** Resolve assignee list from a raw Firestore doc or Lead-shaped object. */
export function resolveAssigneeUids(data: {
  assignedToUids?: unknown;
  assignedToUid?: unknown;
}): string[] {
  if (Array.isArray(data.assignedToUids)) {
    return normalizeAssigneeUids(data.assignedToUids);
  }
  if (typeof data.assignedToUid === "string" && data.assignedToUid.trim()) {
    return [data.assignedToUid.trim()];
  }
  return [];
}

export function leadHasAssignee(
  data: { assignedToUids?: unknown; assignedToUid?: unknown },
  uid: string,
): boolean {
  if (!uid) return false;
  return resolveAssigneeUids(data).includes(uid);
}

/** Firestore write fields for assignee state. */
export function assigneeWriteFields(uids: string[]): {
  assignedToUids: string[];
  assignedToUid: string | null;
} {
  const normalized = normalizeAssigneeUids(uids);
  return {
    assignedToUids: normalized,
    assignedToUid: normalized[0] ?? null,
  };
}

export function mergeAssigneeUids(
  existing: string[],
  toAdd: string[],
): string[] {
  return normalizeAssigneeUids([...existing, ...toAdd]);
}

export function removeAssigneeUids(
  existing: string[],
  toRemove: string[],
): string[] {
  const drop = new Set(normalizeAssigneeUids(toRemove));
  return existing.filter((uid) => !drop.has(uid));
}
