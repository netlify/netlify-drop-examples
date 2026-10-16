import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, ExternalLink, Pencil, PartyPopper } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle, Button, Checkbox, toast } from 'app-packs-ui'
import { getCourseDetailServer, setLessonCompletionServer } from '@/server/learning'
import type { Lesson } from '@/db/schema'
import { appConfig } from '@/config/app'
import { CourseIcon } from '@/components/learning/course-icon'
import { CountPill, DurationPill, PriorityPill, StatusPill } from '@/components/learning/badges'
import { ProgressBar } from '@/components/learning/progress-bar'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/courses/$id')({
  loader: ({ params }) => getCourseDetailServer({ data: { id: params.id } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.course.title ?? 'Course'} · ${appConfig.productName}` }],
  }),
  pendingComponent: () => <LoadingState variant="form" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'this course')} />,
  component: CoursePage,
})

type Filter = 'all' | 'todo' | 'done'

function CoursePage() {
  const data = Route.useLoaderData()
  // Re-key on course id so local optimistic state resets when navigating between courses.
  return <CourseChecklist key={data.course.id} {...data} />
}

function CourseChecklist({
  course,
  lessons,
  completedLessonIds,
  canManage,
}: Awaited<ReturnType<typeof getCourseDetailServer>>) {
  const [completed, setCompleted] = useState(() => new Set(completedLessonIds))
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')
  const [announcement, setAnnouncement] = useState('')

  const doneCount = lessons.filter((l) => completed.has(l.id)).length
  const totalMinutes = lessons.reduce((sum, l) => sum + l.durationMinutes, 0)
  const allDone = lessons.length > 0 && doneCount === lessons.length
  const resources = lessons.filter((l) => l.resourceUrl)
  const visible = lessons.filter((l) =>
    filter === 'all' ? true : filter === 'done' ? completed.has(l.id) : !completed.has(l.id),
  )

  async function toggle(lesson: Lesson, next: boolean) {
    // Optimistic update — revert if the server rejects it.
    const apply = (value: boolean) =>
      setCompleted((prev) => {
        const copy = new Set(prev)
        if (value) copy.add(lesson.id)
        else copy.delete(lesson.id)
        return copy
      })
    apply(next)
    setPending((prev) => new Set(prev).add(lesson.id))
    const nextCount = doneCount + (next ? 1 : -1)
    setAnnouncement(
      `${lesson.title} marked ${next ? 'complete' : 'not complete'}. ${nextCount} of ${lessons.length} lessons done.`,
    )
    try {
      await setLessonCompletionServer({ data: { lessonId: lesson.id, completed: next } })
      if (next && nextCount === lessons.length) {
        toast({
          title: 'Course complete! 🎉',
          description: `You finished ${course.title}.`,
          variant: 'success',
        })
      }
    } catch (err) {
      apply(!next)
      setAnnouncement(`Couldn't save progress for ${lesson.title}.`)
      toast({
        title: 'Progress not saved',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setPending((prev) => {
        const copy = new Set(prev)
        copy.delete(lesson.id)
        return copy
      })
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="small" className="-ml-2">
          <Link to="/">
            <ArrowLeft className="size-4" aria-hidden="true" />
            My learning
          </Link>
        </Button>
        {canManage ? (
          <Button asChild variant="outline" size="small">
            <Link to="/manage/courses/$id" params={{ id: course.id }}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit course
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Course header */}
      <section aria-labelledby="course-title" className="rounded-2xl border bg-card p-5 shadow-xs sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <CourseIcon icon={course.icon} className="size-12" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">{course.category}</p>
            <h1 id="course-title" className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              {course.title}
            </h1>
            <p className="text-muted-foreground">{course.summary}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {course.status !== 'published' ? <StatusPill status={course.status} /> : null}
            <DurationPill minutes={totalMinutes} />
            <CountPill done={doneCount} total={lessons.length} />
          </div>
        </div>
        <ProgressBar
          className="mt-5"
          value={doneCount}
          max={lessons.length}
          label={`${course.title} progress`}
        />

        {course.description || resources.length > 0 ? (
          <details className="group mt-5 rounded-xl bg-muted/60">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
              Course details &amp; resources
              <ChevronDown
                className="size-5 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            <div className="space-y-4 px-4 pb-4 text-sm">
              {course.description ? (
                <p className="leading-relaxed text-muted-foreground">{course.description}</p>
              ) : null}
              {resources.length > 0 ? (
                <div>
                  <h2 className="font-medium">Linked resources</h2>
                  <ul className="mt-2 space-y-1.5">
                    {resources.map((l) => (
                      <li key={l.id}>
                        <ResourceLink
                          href={l.resourceUrl!}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {l.title}
                        </ResourceLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
      </section>

      {allDone ? (
        <Alert variant="success">
          <PartyPopper className="size-4" aria-hidden="true" />
          <AlertTitle>You completed this course</AlertTitle>
          <AlertDescription>
            Nice work. Keep the resources handy, or{' '}
            <Link to="/courses" className="font-medium underline underline-offset-4">
              pick your next course
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Lessons */}
      <section aria-labelledby="lessons-heading" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="lessons-heading" className="text-xl font-semibold tracking-tight">
              Lessons
            </h2>
            <p className="text-sm text-muted-foreground">
              Tick each lesson off as you finish it. <span aria-hidden="true">*</span> marks required lessons.
            </p>
          </div>
          <FilterTabs
            value={filter}
            onChange={setFilter}
            counts={{ all: lessons.length, todo: lessons.length - doneCount, done: doneCount }}
          />
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {lessons.length === 0
              ? 'This course has no lessons yet.'
              : filter === 'done'
                ? 'No completed lessons yet — you’ve got this.'
                : 'Everything here is done. 🎉'}
          </p>
        ) : (
          <ol className="space-y-3">
            {visible.map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                index={lessons.indexOf(lesson) + 1}
                checked={completed.has(lesson.id)}
                busy={pending.has(lesson.id)}
                onToggle={(next) => toggle(lesson, next)}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function FilterTabs({
  value,
  onChange,
  counts,
}: {
  value: Filter
  onChange: (f: Filter) => void
  counts: Record<Filter, number>
}) {
  const options: Array<[Filter, string]> = [
    ['all', 'All'],
    ['todo', 'To do'],
    ['done', 'Done'],
  ]
  return (
    <div
      role="group"
      aria-label="Show lessons"
      className="flex w-full rounded-lg border bg-muted/50 p-1 sm:inline-flex sm:w-auto"
    >
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            'min-h-9 flex-1 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:flex-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            value === key
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label} <span className="text-muted-foreground">({counts[key]})</span>
        </button>
      ))}
    </div>
  )
}

function LessonItem({
  lesson,
  index,
  checked,
  busy,
  onToggle,
}: {
  lesson: Lesson
  index: number
  checked: boolean
  busy: boolean
  onToggle: (next: boolean) => void
}) {
  const checkboxId = `lesson-${lesson.id}`
  const descId = `lesson-${lesson.id}-desc`

  return (
    <li
      className={cn(
        'rounded-2xl border bg-card p-4 transition-colors sm:p-5',
        checked && 'border-primary/30 bg-primary/5',
      )}
    >
      <div className="flex gap-3 sm:gap-4">
        <label htmlFor={checkboxId} className="-m-3 flex cursor-pointer items-start p-3 pt-3.5">
          <Checkbox
            id={checkboxId}
            checked={checked}
            disabled={busy}
            aria-describedby={lesson.description ? descId : undefined}
            onChange={(e) => onToggle(e.currentTarget.checked)}
          />
        </label>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <label htmlFor={checkboxId} className="cursor-pointer text-base leading-snug font-medium">
              <span className="sr-only">Lesson {index}: </span>
              <span className={cn(checked && 'text-muted-foreground line-through decoration-primary/60')}>
                {lesson.title}
              </span>
              {lesson.required ? (
                <>
                  <span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">
                    *
                  </span>
                  <span className="sr-only"> (required)</span>
                </>
              ) : (
                <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
              )}
            </label>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <DurationPill minutes={lesson.durationMinutes} />
              <PriorityPill priority={lesson.priority} />
            </div>
          </div>
          {lesson.description ? (
            <p id={descId} className="text-sm leading-relaxed text-muted-foreground">
              {lesson.description}
            </p>
          ) : null}
          {lesson.resourceUrl ? (
            <Button asChild variant="outline" size="small" className="mt-1">
              <ResourceLink href={lesson.resourceUrl}>Open resource</ResourceLink>
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  )
}

function ResourceLink({
  href,
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    >
      <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}
