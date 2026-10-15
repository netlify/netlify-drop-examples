import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { CourseSummary } from '@/server/learning'
import { CourseIcon } from '@/components/learning/course-icon'
import { CountPill, DurationPill } from '@/components/learning/badges'
import { ProgressBar } from '@/components/learning/progress-bar'

/**
 * Course tile. The whole card is clickable via a stretched link on the
 * title (one tab stop, one accessible name) instead of wrapping the card in
 * an <a>, which would make screen readers read every child as link text.
 */
export function CourseCard({ course }: { course: CourseSummary }) {
  const done = course.lessonCount > 0 && course.completedCount >= course.lessonCount
  const cta = done ? 'Review' : course.completedCount > 0 ? 'Continue' : 'Start course'

  return (
    <article className="group relative flex w-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <CourseIcon icon={course.icon} />
        <CountPill done={course.completedCount} total={course.lessonCount} />
      </div>
      <p className="mt-4 text-xs font-medium tracking-wide text-primary uppercase">{course.category}</p>
      <h3 className="mt-1 text-lg leading-snug font-semibold">
        <Link
          to="/courses/$id"
          params={{ id: course.id }}
          className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']"
        >
          {course.title}
        </Link>
      </h3>
      <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">{course.summary}</p>
      <div className="mt-4 space-y-3">
        <ProgressBar
          size="small"
          value={course.completedCount}
          max={course.lessonCount}
          label={`${course.title} progress`}
        />
        <div className="flex items-center justify-between gap-2">
          <DurationPill minutes={course.totalMinutes} />
          <span
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            aria-hidden="true"
          >
            {cta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </div>
      </div>
    </article>
  )
}
