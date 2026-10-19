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

const PLACEHOLDER_ASSIGNEE_NAMES = new Set([
  "unknown",
  "sales account",
  "you",
]);

export type AssigneeRosterRow = {
  id: string;
  displayName?: string;
  email?: string;
  /** True when this id is a Sales Portal sign-in (`users` + app access). */
  portalUser?: boolean;
  /** Other ids for the same person, hidden from the picker. */
  aliasUids?: string[];
};

export function assigneeDisplayKey(name: string | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function emailRank(email: string | undefined): number {
  const trimmed = email?.trim();
  if (!trimmed) return 2;
  const local = trimmed.split("@")[0] ?? "";
  return /\d+$/.test(local) ? 1 : 0;
}

function preferAssignee<T extends AssigneeRosterRow>(a: T, b: T): T {
  const aLogin = a.portalUser === true ? 0 : 1;
  const bLogin = b.portalUser === true ? 0 : 1;
  if (aLogin !== bLogin) return aLogin < bLogin ? a : b;
  const byEmail = emailRank(a.email) - emailRank(b.email);
  if (byEmail !== 0) return byEmail < 0 ? a : b;
  return a.id.localeCompare(b.id) <= 0 ? a : b;
}

/**
 * One picker row per person. A sales-only profile that repeats a sign-in
 * account's name is kept as an alias so existing assignments still match.
 * Two different sign-in accounts that share a name both stay visible.
 */
export function dedupeAssigneeRoster<T extends AssigneeRosterRow>(
  rows: T[],
): T[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];

  for (const row of rows) {
    const key = assigneeDisplayKey(row.displayName);
    const groupKey =
      !key || PLACEHOLDER_ASSIGNEE_NAMES.has(key) ? `id:${row.id}` : key;
    const existing = groups.get(groupKey);
    if (!existing) {
      groups.set(groupKey, [row]);
      order.push(groupKey);
    } else {
      existing.push(row);
    }
  }

  const result: T[] = [];
  for (const key of order) {
    const group = groups.get(key) ?? [];
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    const logins = group.filter((row) => row.portalUser === true);
    if (logins.length > 1) {
      const primary = logins.reduce(preferAssignee);
      const hidden = group.filter((row) => row.portalUser !== true);
      const aliasUids = [
        ...new Set(
          hidden.flatMap((row) => [row.id, ...(row.aliasUids ?? [])]),
        ),
      ].filter((id) => id !== primary.id);
      result.push({
        ...primary,
        aliasUids: aliasUids.length > 0 ? aliasUids : primary.aliasUids,
      });
      for (const login of logins) {
        if (login.id !== primary.id) result.push(login);
      }
      continue;
    }

    const canonical = group.reduce(preferAssignee);
    const aliasUids = [
      ...new Set(
        group.flatMap((row) => [row.id, ...(row.aliasUids ?? [])]),
      ),
    ].filter((id) => id !== canonical.id);
    result.push({
      ...canonical,
      aliasUids: aliasUids.length > 0 ? aliasUids : undefined,
    });
  }
  return result;
}

export function assigneeMemberLabel(member: {
  id: string;
  displayName?: string;
  email?: string;
}): string {
  return member.displayName || member.email || member.id;
}

export function buildAssigneeNameMap(
  members: Array<{
    id: string;
    displayName?: string;
    email?: string;
    aliasUids?: string[];
  }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const member of members) {
    const label = assigneeMemberLabel(member);
    map.set(member.id, label);
    for (const alias of member.aliasUids ?? []) map.set(alias, label);
  }
  return map;
}

export function assigneeAliasMap(
  members: Array<{ id: string; aliasUids?: string[] }>,
): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  for (const member of members) {
    if (member.aliasUids?.length) map.set(member.id, member.aliasUids);
  }
  return map;
}

export function canonicalizeAssigneeUids(
  uids: string[],
  members: Array<{ id: string; aliasUids?: string[] }>,
): string[] {
  return normalizeAssigneeUids(
    uids.map((uid) => {
      const owner = members.find(
        (member) => member.id === uid || member.aliasUids?.includes(uid),
      );
      return owner?.id ?? uid;
    }),
  );
}

export function formatAssigneeLabels(
  data: { assignedToUids?: unknown; assignedToUid?: unknown },
  nameByUid: Map<string, string> | Record<string, string>,
): string {
  const uids = resolveAssigneeUids(data);
  if (uids.length === 0) return "Unassigned";
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const uid of uids) {
    const label =
      nameByUid instanceof Map ?
        nameByUid.get(uid) || uid
      : nameByUid[uid] || uid;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.join(", ");
}
