import { createFileRoute, Link } from '@tanstack/react-router'
import { BookPlus, ChevronRight, LibraryBig } from 'lucide-react'
import { Button, EmptyState } from 'app-packs-ui'
import { listManagedCoursesServer } from '@/server/learning'
import { appConfig } from '@/config/app'
import { CourseIcon } from '@/components/learning/course-icon'
import { DurationPill, StatusPill } from '@/components/learning/badges'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'

export const Route = createFileRoute('/_app/manage/courses/')({
  loader: () => listManagedCoursesServer(),
  head: () => ({ meta: [{ title: `Manage courses · ${appConfig.productName}` }] }),
  pendingComponent: () => <LoadingState variant="table" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'courses')} />,
  component: ManageCoursesPage,
})

function ManageCoursesPage() {
  const courses = Route.useLoaderData()
  const published = courses.filter((c) => c.status === 'published').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Manage courses</h1>
          <p className="text-muted-foreground">
            {published} published · {courses.length - published} draft
          </p>
        </div>
        <Button asChild>
          <Link to="/manage/courses/new">
            <BookPlus className="size-4" aria-hidden="true" />
            New course
          </Link>
        </Button>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create your first course, add lessons, then publish it for employees."
          icon={<LibraryBig className="size-6" aria-hidden="true" />}
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          {courses.map((course) => (
            <li
              key={course.id}
              className="relative flex items-center gap-3 p-4 hover:bg-muted/50 sm:gap-4 focus-within:bg-muted/50"
            >
              <CourseIcon icon={course.icon} className="hidden sm:inline-flex" />
              <div className="min-w-0 flex-1">
                <Link
                  to="/manage/courses/$id"
                  params={{ id: course.id }}
                  className="font-medium outline-none after:absolute after:inset-0 after:content-[''] focus-visible:underline"
                >
                  {course.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {course.category} · {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
                </p>
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <DurationPill minutes={course.totalMinutes} />
              </div>
              <StatusPill status={course.status} />
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
