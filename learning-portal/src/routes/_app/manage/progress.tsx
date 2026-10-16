import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from 'app-packs-ui'
import { getTeamProgressServer } from '@/server/learning'
import { appConfig } from '@/config/app'
import { ProgressBar } from '@/components/learning/progress-bar'
import { percent } from '@/components/learning/format'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'

export const Route = createFileRoute('/_app/manage/progress')({
  loader: () => getTeamProgressServer(),
  head: () => ({ meta: [{ title: `Team progress · ${appConfig.productName}` }] }),
  pendingComponent: () => <LoadingState variant="table" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'team progress')} />,
  component: TeamProgressPage,
})

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function TeamProgressPage() {
  const { courses, learners, totalLessons, totalRequired } = Route.useLoaderData()

  const avgCompletion = learners.length
    ? Math.round(
        learners.reduce((sum, l) => sum + percent(l.completedCount, totalLessons), 0) / learners.length,
      )
    : 0
  const requiredDone = learners.filter(
    (l) => totalRequired > 0 && l.requiredCompleted >= totalRequired,
  ).length

  // Per-course completion rate across active learners.
  const courseRates = courses.map((course) => {
    const finished = learners.filter((l) => {
      const entry = l.perCourse.find((p) => p.courseId === course.id)
      return course.lessonCount > 0 && (entry?.completed ?? 0) >= course.lessonCount
    }).length
    return { ...course, finished }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team progress</h1>
        <p className="text-muted-foreground">
          How Acme employees are progressing across every published course.
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Stat label="Employees learning" value={String(learners.length)} />
        <Stat label="Average completion" value={`${avgCompletion}%`} />
        <Stat label="Finished all required lessons" value={`${requiredDone} of ${learners.length}`} />
      </dl>

      {learners.length === 0 ? (
        <EmptyState
          title="No learner activity yet"
          description="Progress shows up here as soon as someone completes their first lesson."
          icon={<Users className="size-6" aria-hidden="true" />}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Employees</CardTitle>
              <CardDescription>Sorted by lessons completed.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Phones: stacked list — avoids sideways scrolling through a wide table. */}
              <ul className="divide-y sm:hidden" aria-label="Lesson completion by employee">
                {learners.map((l) => (
                  <li key={l.userId} className="space-y-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.name}</p>
                        {l.email && l.email !== l.name ? (
                          <p className="truncate text-xs text-muted-foreground">{l.email}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-medium tabular-nums">
                        {percent(l.completedCount, totalLessons)}%
                      </span>
                    </div>
                    <ProgressBar
                      size="small"
                      value={l.completedCount}
                      max={totalLessons}
                      label={`${l.name} overall progress`}
                    />
                    <p className="text-xs text-muted-foreground">
                      {l.coursesCompleted}/{courses.length} courses done · Last active{' '}
                      {dateFormat.format(new Date(l.lastActivity))}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="-mx-6 hidden overflow-x-auto px-6 sm:block">
                <table className="w-full min-w-[34rem] text-sm">
                  <caption className="sr-only">Lesson completion by learner</caption>
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Employee
                      </th>
                      <th scope="col" className="w-2/5 py-2 pr-4 font-medium">
                        Overall
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        Courses done
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Last activity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {learners.map((l) => (
                      <tr key={l.userId} className="border-b last:border-0">
                        <th scope="row" className="py-3 pr-4 text-left font-normal">
                          <span className="block font-medium">{l.name}</span>
                          {l.email && l.email !== l.name ? (
                            <span className="block text-xs text-muted-foreground">{l.email}</span>
                          ) : null}
                        </th>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <ProgressBar
                              size="small"
                              value={l.completedCount}
                              max={totalLessons}
                              label={`${l.name} overall progress`}
                            />
                            <span className="w-10 shrink-0 text-right tabular-nums">
                              {percent(l.completedCount, totalLessons)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          {l.coursesCompleted}/{courses.length}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap text-muted-foreground">
                          {dateFormat.format(new Date(l.lastActivity))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Course completion</CardTitle>
              <CardDescription>Employees who finished each course.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {courseRates.map((c) => (
                  <li key={c.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium">{c.title}</span>
                      <span className="shrink-0 text-muted-foreground tabular-nums">
                        {c.finished}/{learners.length}
                      </span>
                    </div>
                    <ProgressBar
                      size="small"
                      value={c.finished}
                      max={learners.length}
                      label={`${c.title} completion`}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{value}</dd>
    </div>
  )
}
