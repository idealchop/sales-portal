export function WaterBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Light airy base */}
      <div className="absolute inset-0 bg-[#f8fcff]" />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 15% 10%, rgba(186, 230, 253, 0.55) 0%, transparent 55%),
            radial-gradient(ellipse 80% 60% at 85% 20%, rgba(224, 242, 254, 0.7) 0%, transparent 50%),
            radial-gradient(ellipse 60% 50% at 50% 100%, rgba(147, 197, 253, 0.2) 0%, transparent 45%),
            linear-gradient(165deg, #f0f9ff 0%, #f8fcff 40%, #ffffff 100%)
          `,
        }}
      />

      {/* Soft surface shimmer */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(56, 189, 248, 0.08) 0%, transparent 12%),
            radial-gradient(circle at 70% 60%, rgba(125, 211, 252, 0.06) 0%, transparent 10%)
          `,
        }}
      />

      {/* Gentle waves */}
      <svg
        className="water-wave absolute bottom-0 left-0 w-[200%] opacity-[0.35]"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0,50 C200,80 400,20 600,50 C800,80 1000,20 1200,50 L1200,100 L0,100 Z"
          fill="rgba(186, 230, 253, 0.45)"
        />
      </svg>
      <svg
        className="water-wave-slow absolute bottom-0 left-0 w-[200%] opacity-25"
        viewBox="0 0 1200 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0,65 C250,35 450,85 600,55 C750,25 950,75 1200,55 L1200,100 L0,100 Z"
          fill="rgba(224, 242, 254, 0.8)"
        />
      </svg>

      {/* Subtle ripple hints */}
      <div className="absolute right-[20%] top-[15%] h-40 w-40 rounded-full border border-sky-200/40" />
      <div className="absolute left-[10%] bottom-[20%] h-24 w-24 rounded-full border border-cyan-100/60" />

      {/* Faint droplet */}
      <svg
        className="absolute right-[30%] top-[12%] h-6 w-6 text-sky-300/30"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
      </svg>
    </div>
  );
}
