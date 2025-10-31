import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
  return (
    <Image 
      src="https://firebasestorage.googleapis.com/v0/b/smartrefill-singapore/o/Brand%20Logo%2FAsset%2022.png?alt=media&token=f7458efe-afd7-4006-862e-40c8d524c080" 
      width={32} 
      height={32} 
      alt="Smart Refill Logo"
      className={className}
    />
  );
}
