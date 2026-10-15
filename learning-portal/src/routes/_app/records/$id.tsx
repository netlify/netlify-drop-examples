import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast, Card, CardContent, CardHeader, CardTitle, Button } from 'app-packs-ui'
import { Trash2 } from 'lucide-react'
import {
  getRecordServer,
  updateRecordServer,
  deleteRecordServer,
  recordInputSchema,
  recordStatusValues,
} from '@/server/records'
import { useAppForm } from '@/components/forms/use-app-form'
import { useSubmission } from '@/lib/submission'
import { FieldGroup } from '@/components/ui/field'
import { SubmitButton } from '@/components/forms/submit-button'
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

export const Route = createFileRoute('/_app/records/$id')({
  loader: ({ params }) => getRecordServer({ data: { id: params.id } }),
  pendingComponent: () => <LoadingState variant="form" />,
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : 'Failed to load record'} />
  ),
  component: RecordDetailPage,
})

function RecordDetailPage() {
  const record = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const { state: saveState, run: runSave } = useSubmission(updateRecordServer)
  const { state: deleteState, run: runDelete } = useSubmission(deleteRecordServer)

  const form = useAppForm({
    defaultValues: {
      title: record.title,
      status: record.status as (typeof recordStatusValues)[number],
      owner: record.owner,
      amount: record.amount,
      dueDate: record.dueDate ?? '',
      notes: record.notes ?? '',
    },
    validators: { onSubmit: recordInputSchema },
    onSubmit: async ({ value }) => {
      await runSave({ data: { id, ...value } })
      toast({ title: 'Record updated' })
    },
  })

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{record.title}</h1>
          <p className="text-muted-foreground">Edit or delete this record.</p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="small">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this record?</AlertDialogTitle>
              <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteState.status === 'submitting'}
                onClick={async () => {
                  await runDelete({ data: { id } })
                  toast({ title: 'Record deleted' })
                  navigate({ to: '/records' })
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
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              form.handleSubmit()
            }}
          >
            <FieldGroup>
              <form.AppField name="title">{(field) => <field.TextField label="Title" />}</form.AppField>
              <form.AppField name="status">
                {(field) => (
                  <field.SelectField
                    label="Status"
                    options={recordStatusValues.map((s) => ({ label: s, value: s }))}
                  />
                )}
              </form.AppField>
              <form.AppField name="owner">{(field) => <field.TextField label="Owner" />}</form.AppField>
              <form.AppField name="amount">
                {(field) => <field.TextField label="Amount" type="number" />}
              </form.AppField>
              <form.AppField name="dueDate">
                {(field) => <field.TextField label="Due date" type="date" />}
              </form.AppField>
              <form.AppField name="notes">{(field) => <field.TextareaField label="Notes" />}</form.AppField>

              <SubmitButton state={saveState} className="w-full">
                Save changes
              </SubmitButton>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
