/** Days to hide Contact after outreach before showing again (if still inactive). */
export const INACTIVE_OWNER_CONTACT_COOLDOWN_DAYS = 7;

export function shouldShowInactiveOwnerContactButton(
  owner: {
    ownerEmail?: string | null;
    lastContactedAt?: string | null;
  },
  now = new Date(),
): boolean {
  if (!owner.ownerEmail?.trim()) return false;

  const contactedAt = owner.lastContactedAt?.trim();
  if (!contactedAt) return true;

  const contactedDate = new Date(contactedAt);
  if (Number.isNaN(contactedDate.getTime())) return true;

  const cooldownEnd = new Date(contactedDate);
  cooldownEnd.setDate(
    cooldownEnd.getDate() + INACTIVE_OWNER_CONTACT_COOLDOWN_DAYS,
  );
  return now.getTime() >= cooldownEnd.getTime();
}

/** Prefer the more recent ISO timestamp (local optimistic vs server). */
export function newerContactedAt(
  a?: string | null,
  b?: string | null,
): string | null {
  const aMs = a?.trim() ? Date.parse(a) : Number.NaN;
  const bMs = b?.trim() ? Date.parse(b) : Number.NaN;
  if (Number.isNaN(aMs) && Number.isNaN(bMs)) return null;
  if (Number.isNaN(aMs)) return b?.trim() || null;
  if (Number.isNaN(bMs)) return a?.trim() || null;
  return aMs >= bMs ? a!.trim() : b!.trim();
}

/** Keep local outreach timestamps when analytics refresh returns stale owners. */
export function mergeOwnersPreservingContact<
  T extends { id: string; lastContactedAt?: string | null },
>(incoming: T[], previous: T[]): T[] {
  const previousById = new Map(previous.map((owner) => [owner.id, owner]));
  return incoming.map((owner) => {
    const prior = previousById.get(owner.id);
    return {
      ...owner,
      lastContactedAt: newerContactedAt(
        owner.lastContactedAt,
        prior?.lastContactedAt,
      ),
    };
  });
}
