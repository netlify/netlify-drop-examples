import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  toast,
} from 'app-packs-ui'
import {
  deleteCourseServer,
  deleteLessonServer,
  getManagedCourseServer,
  updateCourseServer,
  type CourseFormValues,
} from '@/server/learning'
import type { Lesson } from '@/db/schema'
import { appConfig } from '@/config/app'
import { useSubmission } from '@/lib/submission'
import { CourseForm } from '@/components/learning/course-form'
import { LessonDialog } from '@/components/learning/lesson-dialog'
import { DurationPill, PriorityPill, StatusPill } from '@/components/learning/badges'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState } from '@/components/states/error-state'

export const Route = createFileRoute('/_app/manage/courses/$id')({
  loader: ({ params }) => getManagedCourseServer({ data: { id: params.id } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `Edit ${loaderData?.course.title ?? 'course'} · ${appConfig.productName}` }],
  }),
  pendingComponent: () => <LoadingState variant="form" />,
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : 'Failed to load course'} />
  ),
  component: EditCoursePage,
})

function EditCoursePage() {
  const { course, lessons } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const refresh = () => router.invalidate()
  const save = useSubmission(updateCourseServer)
  const remove = useSubmission(deleteCourseServer)
  const nextOrder = lessons.reduce((max, l) => Math.max(max, l.sortOrder), 0) + 1

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="small" className="-ml-2">
          <Link to="/manage/courses">
            <ArrowLeft className="size-4" aria-hidden="true" />
            All courses
          </Link>
        </Button>
        <Button asChild variant="outline" size="small">
          <Link to="/courses/$id" params={{ id: course.id }}>
            <Eye className="size-4" aria-hidden="true" />
            Preview as employee
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
            <StatusPill status={course.status} />
          </div>
          <p className="text-muted-foreground">Edit course details and its lessons.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="small">
              <Trash2 className="size-4" aria-hidden="true" />
              Delete course
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{course.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                Employees will no longer see this course. The course and its progress history are kept and can
                be restored by an administrator.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={remove.state.status === 'submitting'}
                onClick={async () => {
                  await remove.run({ data: { id: course.id } })
                  toast({ title: 'Course deleted' })
                  navigate({ to: '/manage/courses' })
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course details</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            key={course.updatedAt.toString()}
            defaultValues={{
              title: course.title,
              summary: course.summary,
              description: course.description ?? '',
              category: course.category,
              icon: course.icon as CourseFormValues['icon'],
              status: course.status as CourseFormValues['status'],
              sortOrder: String(course.sortOrder),
            }}
            state={save.state}
            submitLabel="Save changes"
            onSubmit={async (value) => {
              try {
                await save.run({ data: { id: course.id, ...value } })
                toast({ title: 'Course saved', variant: 'success' })
                await refresh()
              } catch (err) {
                toast({
                  title: 'Could not save course',
                  description: err instanceof Error ? err.message : undefined,
                  variant: 'destructive',
                })
              }
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Lessons</CardTitle>
            <CardDescription>
              {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} · shown to employees in display
              order
            </CardDescription>
          </div>
          <LessonDialog
            courseId={course.id}
            nextOrder={nextOrder}
            onSaved={refresh}
            trigger={
              <Button size="small">
                <Plus className="size-4" aria-hidden="true" />
                Add lesson
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <EmptyState title="No lessons yet" description="Add the first lesson to this course." />
          ) : (
            <ol className="divide-y rounded-xl border">
              {lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} courseId={course.id} onChanged={refresh} />
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LessonRow({
  lesson,
  courseId,
  onChanged,
}: {
  lesson: Lesson
  courseId: string
  onChanged: () => void
}) {
  const remove = useSubmission(deleteLessonServer)

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-medium">
          <span className="mr-2 text-sm text-muted-foreground tabular-nums">{lesson.sortOrder}.</span>
          {lesson.title}
          {lesson.required ? null : (
            <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <DurationPill minutes={lesson.durationMinutes} />
          <PriorityPill priority={lesson.priority} />
        </div>
      </div>
      <div className="flex gap-2">
        <LessonDialog
          courseId={courseId}
          lesson={lesson}
          onSaved={onChanged}
          trigger={
            <Button variant="outline" size="small" aria-label={`Edit ${lesson.title}`}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </Button>
          }
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="small" aria-label={`Delete ${lesson.title}`}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete “{lesson.title}”?</AlertDialogTitle>
              <AlertDialogDescription>
                It will be removed from the course checklist. Existing completion history is kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={remove.state.status === 'submitting'}
                onClick={async () => {
                  await remove.run({ data: { id: lesson.id } })
                  toast({ title: 'Lesson deleted' })
                  onChanged()
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}
