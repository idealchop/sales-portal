import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
  asChild?: boolean;
  href?: string;
  children: ReactNode;
};

const variants = {
  primary:
    "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]",
  outline:
    "border border-[var(--border)] bg-white text-foreground hover:bg-zinc-50",
  ghost: "text-[var(--primary)] hover:bg-teal-50",
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild,
  href,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center rounded-lg font-medium transition disabled:opacity-60",
    variants[variant],
    sizes[size],
    className,
  );

  if (asChild && href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
