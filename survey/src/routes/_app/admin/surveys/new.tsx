import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { toast, Button, Card, CardContent, CardHeader, CardTitle } from 'app-packs-ui'
import {
  createSurveyServer,
  surveyInputSchema,
  questionTypeValues,
  type SurveyFormValues,
} from '@/server/surveys'
import { useAppForm } from '@/components/forms/use-app-form'
import { useSubmission } from '@/lib/submission'
import { Field, FieldGroup, FieldLabel, FieldError, FieldSeparator } from '@/components/ui/field'
import { formatFieldErrors } from '@/components/forms/format-field-errors'
import { SubmitButton } from '@/components/forms/submit-button'

export const Route = createFileRoute('/_app/admin/surveys/new')({
  component: NewSurveyPage,
})

const questionTypeLabels: Record<(typeof questionTypeValues)[number], string> = {
  multiple_choice: 'Multiple choice',
  rating: 'Rating',
  free_text: 'Free text',
}

const questionTypeOptions = questionTypeValues.map((type) => ({ label: questionTypeLabels[type], value: type }))

const ratingScaleOptions = ['3', '5', '7', '10'].map((n) => ({ label: `1–${n}`, value: n }))

type QuestionFormValue = SurveyFormValues['questions'][number]

function makeEmptyQuestion(): QuestionFormValue {
  return { id: crypto.randomUUID(), type: 'multiple_choice', text: '', options: ['', ''], scale: '5' }
}

function NewSurveyPage() {
  const navigate = useNavigate()
  const { state, run } = useSubmission(createSurveyServer)

  const form = useAppForm({
    defaultValues: {
      title: '',
      description: '',
      questions: [makeEmptyQuestion()],
    } satisfies SurveyFormValues,
    validators: { onSubmit: surveyInputSchema },
    onSubmit: async ({ value }) => {
      await run({ data: value })
      toast({ title: 'Survey created' })
      navigate({ to: '/admin/surveys' })
    },
  })

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New survey</h1>
        <p className="text-muted-foreground">Add a title, description, and at least one question.</p>
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
              <form.AppField name="description">
                {(field) => <field.TextareaField label="Description" />}
              </form.AppField>

              <FieldSeparator>Questions</FieldSeparator>

              <form.AppField name="questions" mode="array">
                {(questionsField) => (
                  <div className="space-y-4">
                    {questionsField.state.value.map((question, index) => (
                      <Card key={question.id} className="border-dashed">
                        <CardContent className="space-y-4 pt-6">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 space-y-4">
                              <form.AppField name={`questions[${index}].type`}>
                                {(field) => (
                                  <field.SelectField label="Question type" options={questionTypeOptions} />
                                )}
                              </form.AppField>

                              <form.AppField name={`questions[${index}].text`}>
                                {(field) => <field.TextField label="Question text" />}
                              </form.AppField>

                              {/* Re-subscribes to `type` separately (rather than reusing the
                                  outer `questions` array snapshot above) — the array-mode
                                  field only re-renders on length/order changes, not on a
                                  nested scalar field like `type` changing value. */}
                              <form.AppField name={`questions[${index}].type`}>
                                {(field) => (
                                  <>
                                    {field.state.value === 'multiple_choice' ? (
                                      <form.AppField name={`questions[${index}].options`} mode="array">
                                        {(optionsField) => (
                                          <Field>
                                            <FieldLabel>Options</FieldLabel>
                                            <div className="space-y-2">
                                              {optionsField.state.value.map((_, optionIndex) => (
                                                <div key={optionIndex} className="flex items-center gap-2">
                                                  <form.AppField
                                                    name={`questions[${index}].options[${optionIndex}]`}
                                                  >
                                                    {(field) => (
                                                      <field.TextField label={`Option ${optionIndex + 1}`} />
                                                    )}
                                                  </form.AppField>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="mt-6"
                                                    disabled={optionsField.state.value.length <= 2}
                                                    onClick={() => optionsField.removeValue(optionIndex)}
                                                  >
                                                    <Trash2 className="size-4" />
                                                  </Button>
                                                </div>
                                              ))}
                                            </div>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="small"
                                              onClick={() => optionsField.pushValue('')}
                                            >
                                              <Plus className="size-4" />
                                              Add option
                                            </Button>
                                            <FieldError errors={formatFieldErrors(optionsField.state.meta.errors)} />
                                          </Field>
                                        )}
                                      </form.AppField>
                                    ) : null}

                                    {field.state.value === 'rating' ? (
                                      <form.AppField name={`questions[${index}].scale`}>
                                        {(scaleField) => (
                                          <scaleField.SelectField label="Scale" options={ratingScaleOptions} />
                                        )}
                                      </form.AppField>
                                    ) : null}
                                  </>
                                )}
                              </form.AppField>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={questionsField.state.value.length <= 1}
                              onClick={() => questionsField.removeValue(index)}
                              aria-label="Remove question"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => questionsField.pushValue(makeEmptyQuestion())}
                    >
                      <Plus className="size-4" />
                      Add question
                    </Button>
                    <FieldError errors={formatFieldErrors(questionsField.state.meta.errors)} />
                  </div>
                )}
              </form.AppField>

              <SubmitButton state={state} className="w-full">
                Create survey
              </SubmitButton>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
