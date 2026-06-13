export function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
      <div
        className="h-full rounded-full bg-[var(--primary)] transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
