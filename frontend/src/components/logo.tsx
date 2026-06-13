import Image from "next/image";

export const BRAND_LOGO = {
  white:
    "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FLogo%20icon%202.png?alt=media&token=e9c98391-d60e-4267-9d78-3c09b8028b7c",
  black:
    "https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FLogo%20icon%203.0.png?alt=media&token=72c29968-78bb-4c40-9f86-1ea63d9f49e0",
} as const;

export type LogoVariant = keyof typeof BRAND_LOGO;

export function Logo({
  className,
  size = 40,
  variant = "black",
}: {
  className?: string;
  size?: number;
  /** `black` on light backgrounds; `white` on dark backgrounds */
  variant?: LogoVariant;
}) {
  return (
    <Image
      src={BRAND_LOGO[variant]}
      alt="Smart Refill"
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}
