import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, toast } from 'app-packs-ui'
import { deleteJobServer, getJobServer, updateJobServer } from '@/server/recruiting'
import { JobForm } from '@/components/job-form'
import { ConfirmDelete } from '@/components/confirm-delete'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { useSubmission } from '@/lib/submission'
export const Route = createFileRoute('/_app/recruiting/jobs/$id')({
  loader: ({ params }) => getJobServer({ data: { id: params.id } }),
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'this job')} />,
  component: EditJob,
})
function EditJob() {
  const { job, applications } = Route.useLoaderData()
  const nav = useNavigate()
  const router = useRouter()
  const save = useSubmission(updateJobServer)
  const remove = useSubmission(deleteJobServer)
  const count = applications.length
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/recruiting" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        Hiring overview
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{job.title}</h1>
          <p className="text-muted-foreground">
            Edit details or change whether this role is publicly visible.
          </p>
        </div>
        <ConfirmDelete
          title="Delete this job?"
          description={
            count
              ? `This also removes its ${count} application${count === 1 ? '' : 's'} and their notes. To stop new applications but keep candidates, set the status to Closed instead.`
              : 'The role comes off the careers page and out of the hiring overview.'
          }
          disabled={remove.state.status === 'submitting'}
          onConfirm={async () => {
            try {
              await remove.run({ data: { id: job.id } })
              toast({ title: 'Job deleted' })
              // Drop data preloaded on hover so the overview doesn't show the deleted row.
              router.clearCache()
              nav({ to: '/recruiting' })
            } catch (error) {
              toast({
                title: error instanceof Error ? error.message : 'Could not delete job',
                variant: 'destructive',
              })
            }
          }}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Role details</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm
            job={job}
            submitting={save.state.status === 'submitting'}
            onSubmit={async (value) => {
              await save.run({ data: { id: job.id, ...value } as any })
              toast({ title: 'Job updated' })
              router.invalidate()
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Applicants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {count ? (
            applications.map((a) => (
              <Link
                key={a.id}
                to="/recruiting/applications/$id"
                params={{ id: a.id }}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{a.candidateName}</p>
                  <p className="text-xs text-muted-foreground">
                    Applied {new Date(a.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline">{a.status}</Badge>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No applications yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
