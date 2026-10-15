import { createFormHook } from '@tanstack/react-form'
import { fieldContext, formContext } from '@/components/forms/form-context'
import { TextField } from '@/components/forms/fields/text-field'
import { TextareaField } from '@/components/forms/fields/textarea-field'
import { SelectField } from '@/components/forms/fields/select-field'
import { CheckboxField } from '@/components/forms/fields/checkbox-field'

/**
 * The app-wide form hook. Use this instead of TanStack Form's bare
 * `useForm` so every form gets the same field components for free:
 *
 * ```tsx
 * const form = useAppForm({
 *   defaultValues: { title: '' },
 *   validators: { onSubmit: mySchema },
 *   onSubmit: async ({ value }) => { ... },
 * })
 *
 * <form.AppField name="title">
 *   {(field) => <field.TextField label="Title" />}
 * </form.AppField>
 * ```
 *
 * To add a new field type, create it under `components/forms/fields/` and
 * register it in `fieldComponents` below.
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    TextareaField,
    SelectField,
    CheckboxField,
  },
  formComponents: {},
})
