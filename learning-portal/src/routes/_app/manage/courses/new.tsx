import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, toast } from 'app-packs-ui'
import { createCourseServer } from '@/server/learning'
import { appConfig } from '@/config/app'
import { useSubmission } from '@/lib/submission'
import { CourseForm, emptyCourseValues } from '@/components/learning/course-form'

export const Route = createFileRoute('/_app/manage/courses/new')({
  head: () => ({ meta: [{ title: `New course · ${appConfig.productName}` }] }),
  component: NewCoursePage,
})

function NewCoursePage() {
  const navigate = useNavigate()
  const { state, run } = useSubmission(createCourseServer)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button asChild variant="ghost" size="small" className="-ml-2">
        <Link to="/manage/courses">
          <ArrowLeft className="size-4" aria-hidden="true" />
          All courses
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New course</h1>
        <p className="text-muted-foreground">Start as a draft, add lessons, then publish when it’s ready.</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <CourseForm
            defaultValues={emptyCourseValues}
            state={state}
            submitLabel="Create course"
            onSubmit={async (value) => {
              try {
                const course = await run({ data: value })
                toast({ title: 'Course created', description: 'Now add some lessons.', variant: 'success' })
                navigate({ to: '/manage/courses/$id', params: { id: course.id } })
              } catch (err) {
                toast({
                  title: 'Could not create course',
                  description: err instanceof Error ? err.message : undefined,
                  variant: 'destructive',
                })
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
