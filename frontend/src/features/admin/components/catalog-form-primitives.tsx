import type { ReactNode } from "react";

const inputClassName =
  "h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2";
const textareaClassName =
  "min-h-[88px] w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none ring-[var(--primary)] focus:ring-2";
const selectClassName =
  "h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-sm outline-none ring-[var(--primary)] focus:ring-2";
const labelClassName = "text-sm font-medium text-foreground";
const hintClassName = "text-xs text-zinc-500";

export function CatalogField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className ?? "block space-y-1.5"}>
      <span className={labelClassName}>{label}</span>
      {children}
      {hint && <p className={hintClassName}>{hint}</p>}
    </label>
  );
}

export function CatalogTextInput({
  value,
  onChange,
  placeholder,
  disabled,
  mono,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${inputClassName}${mono ? " font-mono" : ""}${disabled ? " bg-zinc-50 text-zinc-500" : ""}`}
    />
  );
}

export function CatalogNumberInput({
  value,
  onChange,
  placeholder,
  min,
  step,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  step?: number | string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={inputClassName}
    />
  );
}

export function CatalogTextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={textareaClassName}
    />
  );
}

export function CatalogSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={selectClassName}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function CatalogCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)]"
      />
      {label}
    </label>
  );
}

export function CatalogFormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/60 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export { inputClassName, textareaClassName, selectClassName };
