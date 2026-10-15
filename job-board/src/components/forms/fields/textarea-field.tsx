import { useFieldContext } from '@/components/forms/form-context'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

export function TextareaField({
  label,
  description,
  placeholder,
  rows = 4,
}: {
  label: string
  description?: string
  placeholder?: string
  rows?: number
}) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        rows={rows}
        placeholder={placeholder}
        value={field.state.value ?? ''}
        aria-invalid={errors.length > 0}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={errors.map((e) => ({ message: typeof e === 'string' ? e : String(e) }))} />
    </Field>
  )
}
