/**
 * Multi-assignee helpers for leads.
 * Canonical field: `assignedToUids: string[]`
 * Legacy `assignedToUid` is first assignee (or undefined when empty).
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

export function leadIsUnassigned(data: {
  assignedToUids?: unknown;
  assignedToUid?: unknown;
}): boolean {
  return resolveAssigneeUids(data).length === 0;
}

export function formatAssigneeLabels(
  data: { assignedToUids?: unknown; assignedToUid?: unknown },
  nameByUid: Map<string, string> | Record<string, string>,
): string {
  const uids = resolveAssigneeUids(data);
  if (uids.length === 0) return "Unassigned";
  return uids
    .map((uid) => {
      if (nameByUid instanceof Map) {
        return nameByUid.get(uid) || uid;
      }
      return nameByUid[uid] || uid;
    })
    .join(", ");
}
