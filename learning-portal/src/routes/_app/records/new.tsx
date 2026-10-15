import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast, Card, CardContent, CardHeader, CardTitle } from 'app-packs-ui'
import { createRecordServer, recordInputSchema, recordStatusValues } from '@/server/records'
import { useAppForm } from '@/components/forms/use-app-form'
import { useSubmission } from '@/lib/submission'
import { FieldGroup } from '@/components/ui/field'
import { SubmitButton } from '@/components/forms/submit-button'

export const Route = createFileRoute('/_app/records/new')({
  component: NewRecordPage,
})

function NewRecordPage() {
  const navigate = useNavigate()
  const { state, run } = useSubmission(createRecordServer)

  const form = useAppForm({
    defaultValues: {
      title: '',
      status: 'draft' as (typeof recordStatusValues)[number],
      owner: '',
      amount: '0',
      dueDate: '',
      notes: '',
    },
    validators: { onSubmit: recordInputSchema },
    onSubmit: async ({ value }) => {
      const record = await run({ data: value })
      toast({ title: 'Record created' })
      navigate({ to: '/records/$id', params: { id: record.id } })
    },
  })

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New record</h1>
        <p className="text-muted-foreground">Create a new record.</p>
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

              <SubmitButton state={state} className="w-full">
                Create record
              </SubmitButton>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
