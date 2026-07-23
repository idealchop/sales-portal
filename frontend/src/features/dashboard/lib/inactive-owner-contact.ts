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
