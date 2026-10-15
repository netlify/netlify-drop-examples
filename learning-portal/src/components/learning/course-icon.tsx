import {
  BarChart3,
  BookOpen,
  Building2,
  Laptop,
  Handshake,
  Heart,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Keep keys in sync with `courseIconValues` in `src/server/learning.ts`.
export const courseIcons: Record<string, { icon: LucideIcon; label: string }> = {
  book: { icon: BookOpen, label: 'Book' },
  building: { icon: Building2, label: 'Building (company)' },
  laptop: { icon: Laptop, label: 'Laptop (tools)' },
  scale: { icon: Scale, label: 'Scales (law)' },
  shield: { icon: ShieldCheck, label: 'Shield (safety)' },
  handshake: { icon: Handshake, label: 'Handshake (relations)' },
  users: { icon: Users, label: 'People (hiring)' },
  heart: { icon: Heart, label: 'Heart (benefits)' },
  chart: { icon: BarChart3, label: 'Chart (analytics)' },
  sparkles: { icon: Sparkles, label: 'Sparkles (leadership)' },
}

/** Decorative course icon tile — hidden from assistive tech; the title carries meaning. */
export function CourseIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = (courseIcons[icon] ?? courseIcons.book).icon
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  )
}
