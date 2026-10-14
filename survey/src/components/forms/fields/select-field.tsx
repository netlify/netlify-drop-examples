import { useFieldContext } from '@/components/forms/form-context'
import { Field, FieldLabel, FieldError, FieldDescription } from '@/components/ui/field'
import { formatFieldErrors } from '@/components/forms/format-field-errors'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function SelectField({
  label,
  description,
  options,
  placeholder = 'Select...',
}: {
  label: string
  description?: string
  placeholder?: string
  options: Array<{ label: string; value: string }>
}) {
  const field = useFieldContext<string>()
  const errors = field.state.meta.errors

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select value={field.state.value} onValueChange={(value) => field.handleChange(value)}>
        <SelectTrigger id={field.name} aria-invalid={errors.length > 0} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldError errors={formatFieldErrors(errors)} />
    </Field>
  )
}
