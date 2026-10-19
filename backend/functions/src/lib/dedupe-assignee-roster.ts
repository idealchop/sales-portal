const PLACEHOLDER_ASSIGNEE_NAMES = new Set([
  "unknown",
  "sales account",
  "you",
]);

export type AssigneeRosterRow = {
  id: string;
  displayName?: string;
  email?: string;
  portalUser?: boolean;
  aliasUids?: string[];
};

function assigneeDisplayKey(name: string | undefined): string {
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
 * One assignee row per person. A sales-only profile that repeats a sign-in
 * account's name is stored on `aliasUids`. Two sign-in accounts that share
 * a name both stay in the list.
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
