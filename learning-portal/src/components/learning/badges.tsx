import { AlertCircle, CircleCheck, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMinutes } from '@/components/learning/format'

const pill =
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap'

export function DurationPill({ minutes, className }: { minutes: number; className?: string }) {
  return (
    <span className={cn(pill, 'bg-background text-foreground', className)}>
      <Clock className="size-3.5" aria-hidden="true" />
      <span className="sr-only">Estimated time: </span>
      {formatMinutes(minutes)}
    </span>
  )
}

// Colors chosen for ≥4.5:1 text contrast in both themes; priority is also
// spelled out in text, so color is never the only signal.
const priorityStyles: Record<string, string> = {
  high: 'border-transparent bg-red-600 text-white dark:bg-red-500/90',
  medium:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200',
  low: 'bg-muted text-muted-foreground',
}

export function PriorityPill({ priority }: { priority: string }) {
  return (
    <span className={cn(pill, priorityStyles[priority] ?? priorityStyles.low)}>
      <AlertCircle className="size-3.5" aria-hidden="true" />
      <span className="sr-only">Priority: </span>
      {priority}
    </span>
  )
}

/** Dark "3/7" counter pill from the course header. */
export function CountPill({ done, total, className }: { done: number; total: number; className?: string }) {
  const complete = total > 0 && done >= total
  return (
    <span
      className={cn(
        pill,
        'border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
        complete && 'bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground',
        className,
      )}
    >
      {complete ? <CircleCheck className="size-3.5" aria-hidden="true" /> : null}
      {done}/{total}
      <span className="sr-only"> lessons completed</span>
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        pill,
        status === 'published'
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-dashed bg-background text-muted-foreground',
      )}
    >
      {status === 'published' ? 'Published' : 'Draft'}
    </span>
  )
}
