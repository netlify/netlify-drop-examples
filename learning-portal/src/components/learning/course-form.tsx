import {
  courseInputSchema,
  courseIconValues,
  courseStatusValues,
  type CourseFormValues,
} from '@/server/learning'
import { useAppForm } from '@/components/forms/use-app-form'
import { FieldGroup } from '@/components/ui/field'
import { SubmitButton } from '@/components/forms/submit-button'
import { courseIcons } from '@/components/learning/course-icon'
import type { SubmissionState } from '@/lib/submission'

export const emptyCourseValues: CourseFormValues = {
  title: '',
  summary: '',
  description: '',
  category: '',
  icon: 'book',
  status: 'draft',
  sortOrder: '0',
}

/** Shared create/edit form for a course's metadata (lessons are managed separately). */
export function CourseForm({
  defaultValues,
  state,
  submitLabel,
  onSubmit,
}: {
  defaultValues: CourseFormValues
  state: SubmissionState
  submitLabel: string
  onSubmit: (value: CourseFormValues) => Promise<void>
}) {
  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: courseInputSchema },
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.AppField name="title">{(field) => <field.TextField label="Title" />}</form.AppField>
        <form.AppField name="summary">
          {(field) => <field.TextField label="Summary" description="One sentence shown on course cards." />}
        </form.AppField>
        <form.AppField name="description">{(field) => <field.TextareaField label="Details" />}</form.AppField>
        <div className="grid gap-6 sm:grid-cols-2">
          <form.AppField name="category">
            {(field) => <field.TextField label="Topic" placeholder="e.g. Compliance" />}
          </form.AppField>
          <form.AppField name="icon">
            {(field) => (
              <field.SelectField
                label="Icon"
                options={courseIconValues.map((value) => ({ value, label: courseIcons[value].label }))}
              />
            )}
          </form.AppField>
          <form.AppField name="status">
            {(field) => (
              <field.SelectField
                label="Status"
                description="Only published courses are visible to employees."
                options={courseStatusValues.map((value) => ({
                  value,
                  label: value === 'published' ? 'Published' : 'Draft',
                }))}
              />
            )}
          </form.AppField>
          <form.AppField name="sortOrder">
            {(field) => (
              <field.TextField
                label="Display order"
                type="number"
                description="Lower numbers appear first."
              />
            )}
          </form.AppField>
        </div>
        <SubmitButton state={state} className="w-full sm:w-auto">
          {submitLabel}
        </SubmitButton>
      </FieldGroup>
    </form>
  )
}
