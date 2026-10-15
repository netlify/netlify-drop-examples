import { cn } from '@/lib/utils'

/**
 * Accessible progress meter. Uses `role="progressbar"` with explicit
 * min/max/now and a text alternative so screen readers announce
 * "Course progress, 3 of 6 lessons, 50%" rather than a bare number.
 */
export function ProgressBar({
  value,
  max,
  label,
  className,
  size = 'default',
}: {
  value: number
  max: number
  label: string
  className?: string
  size?: 'default' | 'small'
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max} completed, ${pct}%`}
      className={cn(
        'w-full overflow-hidden rounded-full bg-primary/15',
        size === 'small' ? 'h-1.5' : 'h-2.5',
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
