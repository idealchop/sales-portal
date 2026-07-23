import { Timestamp } from "firebase-admin/firestore";

const PH_TZ = "Asia/Manila";

function toDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === "function") {
      try {
        const d = maybe.toDate();
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
      } catch {
        /* ignore */
      }
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Formats a Firestore date field for OR PDF lines (Asia/Manila). */
export function formatSubscriptionReceiptDate(value: unknown): string {
  const d = toDate(value);
  if (!d) {
    return typeof value === "string" && value.trim() ? value.trim() : "—";
  }
  return d.toLocaleDateString("en-PH", {
    timeZone: PH_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
