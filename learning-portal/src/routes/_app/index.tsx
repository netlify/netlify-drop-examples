import type { ReactNode } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, ChevronDown, CircleHelp, GraduationCap, Mail } from 'lucide-react'
import { Button, EmptyState } from 'app-packs-ui'
import { getLearnerOverviewServer, type CourseSummary } from '@/server/learning'
import { appConfig } from '@/config/app'
import { HeroBackdrop } from '@/components/learning/hero-backdrop'
import { ProgressBar } from '@/components/learning/progress-bar'
import { CourseCard } from '@/components/learning/course-card'
import { formatMinutes, percent } from '@/components/learning/format'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'

// Loader goes through the createServerFn wrapper (src/server/learning.ts),
// never src/data/*.ts directly — see AGENTS.md.
export const Route = createFileRoute('/_app/')({
  loader: () => getLearnerOverviewServer(),
  head: () => ({ meta: [{ title: `My learning · ${appConfig.productName}` }] }),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'your learning')} />,
  component: Dashboard,
})

function Dashboard() {
  const { learnerName, courses } = Route.useLoaderData()
  const { learning } = appConfig

  const totalLessons = courses.reduce((sum, c) => sum + c.lessonCount, 0)
  const completedLessons = courses.reduce((sum, c) => sum + c.completedCount, 0)
  const totalMinutes = courses.reduce((sum, c) => sum + c.totalMinutes, 0)
  const pct = percent(completedLessons, totalLessons)
  const inProgress = courses.filter((c) => c.completedCount > 0 && c.completedCount < c.lessonCount)
  const notStarted = courses.filter((c) => c.completedCount === 0)
  const completed = courses.filter((c) => c.lessonCount > 0 && c.completedCount >= c.lessonCount)
  const firstName = learnerName.split(/[\s@]/)[0]

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Hero */}
      <section
        aria-labelledby="welcome-heading"
        className="relative -mx-4 -mt-6 overflow-hidden px-4 py-8 sm:mx-0 sm:mt-0 sm:rounded-3xl sm:px-8 sm:py-10"
      >
        <HeroBackdrop />
        <div className="relative mx-auto max-w-4xl space-y-4">
          <div className="rounded-2xl border border-primary/20 bg-background/85 p-5 shadow-sm backdrop-blur-sm sm:p-7">
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="hidden size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:inline-flex"
              >
                <GraduationCap className="size-6" />
              </span>
              <div className="min-w-0 space-y-1">
                <h1
                  id="welcome-heading"
                  className="text-2xl font-bold tracking-tight text-balance sm:text-3xl"
                >
                  {learning.welcomeTitle}, {firstName}!
                </h1>
                <p className="text-muted-foreground">{learning.welcomeSubtitle}</p>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-medium">
                  Progress: {completedLessons} of {totalLessons} lessons completed
                </p>
                <span
                  aria-hidden="true"
                  className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                >
                  {pct}%
                </span>
              </div>
              <ProgressBar value={completedLessons} max={totalLessons} label="Overall learning progress" />
            </div>
          </div>
          <ul className="flex flex-wrap justify-center gap-2 text-sm" aria-label="Summary">
            <SummaryChip>{inProgress.length} in progress</SummaryChip>
            <SummaryChip>{completed.length} completed</SummaryChip>
            <SummaryChip>{formatMinutes(totalMinutes)} of learning</SummaryChip>
          </ul>
        </div>
      </section>

      {/* Intro + tips */}
      <section aria-labelledby="intro-heading" className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 id="intro-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome to {appConfig.productName}
          </h2>
          <p className="mt-1 text-muted-foreground">{appConfig.tagline}</p>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-10">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Getting started</h3>
            {learning.gettingStarted.map((p) => (
              <p key={p} className="leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Estimated time:</span>{' '}
              {formatMinutes(totalMinutes)} across {courses.length}{' '}
              {courses.length === 1 ? 'course' : 'courses'}
            </p>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tips for success</h3>
            <ul className="space-y-3">
              {learning.tips.map((tip) => (
                <li key={tip} className="flex gap-3 text-muted-foreground">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <HelpPanel />

      {/* Courses */}
      {courses.length === 0 ? (
        <EmptyState
          title="No courses published yet"
          description="New courses will show up here as soon as they’re published."
          icon={<GraduationCap className="size-6" aria-hidden="true" />}
        />
      ) : (
        <>
          {inProgress.length > 0 ? (
            <CourseSection id="continue" title="Continue learning" courses={inProgress} />
          ) : null}
          {notStarted.length > 0 ? (
            <CourseSection
              id="up-next"
              title={inProgress.length ? 'Up next' : 'Start here'}
              courses={notStarted}
            />
          ) : null}
          {completed.length > 0 ? (
            <CourseSection id="completed" title="Completed" courses={completed} />
          ) : null}
          <div className="flex justify-center">
            <Button asChild variant="outline">
              <Link to="/courses">
                Browse the full catalog
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryChip({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-full bg-slate-900 px-3 py-1 font-medium text-white dark:bg-slate-100 dark:text-slate-900">
      {children}
    </li>
  )
}

function CourseSection({ id, title, courses }: { id: string; title: string; courses: Array<CourseSummary> }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-4">
      <h2 id={`${id}-heading`} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <li key={course.id} className="flex">
            <CourseCard course={course} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Native <details> disclosure — keyboard and screen-reader accessible without extra JS. */
function HelpPanel() {
  return (
    <details className="group mx-auto max-w-5xl rounded-2xl border border-primary/20 bg-primary/5">
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl p-5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <CircleHelp className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1">
          <span className="block text-lg font-semibold">Need help?</span>
          <span className="block text-sm text-muted-foreground">
            Not sure where to start? Reach out to the right contact for each topic.
          </span>
        </span>
        <ChevronDown
          className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <ul className="grid gap-3 px-5 pb-5 md:grid-cols-3">
        {appConfig.learning.helpContacts.map((c) => (
          <li key={c.topic} className="rounded-xl border bg-background p-4">
            <p className="text-sm font-medium">{c.topic}</p>
            <p className="text-sm text-muted-foreground">{c.contact}</p>
            <a
              href={`mailto:${c.detail}`}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium break-all text-primary underline-offset-4 hover:underline"
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              {c.detail}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
