import { useFieldContext } from '@/components/forms/form-context'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Checkbox } from 'app-packs-ui'

export function CheckboxField({ label }: { label: string }) {
  const field = useFieldContext<boolean>()
  const errors = field.state.meta.errors

  return (
    <Field orientation="horizontal" data-invalid={errors.length > 0}>
      <Checkbox
        id={field.name}
        name={field.name}
        checked={!!field.state.value}
        aria-invalid={errors.length > 0}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.currentTarget.checked)}
      />
      <FieldLabel htmlFor={field.name} className="font-normal">
        {label}
      </FieldLabel>
      <FieldError errors={errors.map((e) => ({ message: typeof e === 'string' ? e : String(e) }))} />
    </Field>
  )
}
