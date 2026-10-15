/**
 * Soft illustrated backdrop behind the welcome card — abstract leaves,
 * desks, and figures in the brand tint. Purely decorative (aria-hidden),
 * and it scales with `preserveAspectRatio="xMidYMid slice"` so it fills the
 * hero on any screen width.
 */
export function HeroBackdrop() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-0 size-full text-primary"
      viewBox="0 0 1200 360"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.07" />
          <stop offset="1" stopColor="#8b7cf6" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <rect width="1200" height="360" fill="url(#hero-fade)" />
      <g fill="currentColor" opacity="0.09">
        {/* left leaves */}
        <path d="M40 360c0-90 30-150 80-190-10 70-30 130-80 190Z" />
        <path d="M70 360c10-70 60-120 120-140-30 60-70 110-120 140Z" />
        {/* right leaves */}
        <path d="M1160 360c0-100-30-160-80-200 10 80 30 140 80 200Z" />
        <path d="M1130 360c-15-70-60-115-115-135 25 60 65 105 115 135Z" />
        {/* figures */}
        <circle cx="210" cy="120" r="22" />
        <path d="M175 360v-150c0-20 15-38 35-38s35 18 35 38v150Z" />
        <circle cx="980" cy="110" r="22" />
        <path d="M945 360v-160c0-20 15-38 35-38s35 18 35 38v160Z" />
        <circle cx="610" cy="96" r="20" />
        <path d="M578 360v-170c0-18 14-34 32-34s32 16 32 34v170Z" />
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="3" opacity="0.12">
        {/* laptops on desks */}
        <path d="M300 300h120l-14-48h-92Z" />
        <path d="M770 300h120l-14-48h-92Z" />
        <path d="M260 330h680" strokeLinecap="round" />
        {/* presentation board */}
        <rect x="480" y="40" width="260" height="20" rx="6" />
      </g>
    </svg>
  )
}
