export const inputClassName =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-foreground outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

export const textareaClassName =
  "min-h-[96px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

export const labelClassName =
  "mb-1.5 block text-xs font-medium text-zinc-600";

export const sectionTitleClassName =
  "text-sm font-semibold text-foreground";

export function formatDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function parseDateTimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
