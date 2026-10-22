import { ExternalLink } from 'lucide-react'

/** "Make this app yours" pill, shown only on the official demo site. */
export function NetlifyDeployBadge({ href = 'https://app.netlify.com/drop?example=chat' }: { href?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed right-4 bottom-4 z-50 inline-flex min-h-11 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-[#24434b] bg-[#0b2930] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#103740] focus-visible:ring-2 focus-visible:ring-[#32e6e2] focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      style={{ fontFamily: "'Figtree', sans-serif" }}
      aria-label="Make this app yours on Netlify"
    >
      <img src="/netlify-monogram-darkmode.svg" alt="" width={16} height={16} className="size-4 shrink-0" />
      <span className="whitespace-nowrap">Make this app yours</span>
      <ExternalLink className="size-4 shrink-0 text-[#32e6e2]" aria-hidden="true" />
    </a>
  )
}
