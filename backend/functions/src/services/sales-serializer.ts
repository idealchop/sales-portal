import type { Timestamp } from "firebase-admin/firestore";

export function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as Timestamp).toDate === "function"
  ) {
    return (value as Timestamp).toDate().toISOString();
  }
  return null;
}

export function serializeDoc<T extends Record<string, unknown>>(
  id: string,
  data: Record<string, unknown>,
): T {
  const output: Record<string, unknown> = { ...data, id };

  for (const key of ["createdAt", "updatedAt"]) {
    if (key in output) {
      output[key] = toIsoString(output[key]) ?? output[key];
    }
  }

  return output as T;
}
