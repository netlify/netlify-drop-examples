import { useFieldContext } from '@/components/forms/form-context'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field'
import { Input } from 'app-packs-ui'

export function TextField({
  label,
  description,
  type = 'text',
  placeholder,
}: {
  label: string
  description?: string
  type?: string
  placeholder?: string
}) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
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
