import { createFormHookContexts } from '@tanstack/react-form'

// Split into its own file (rather than living inside use-app-form.ts) to
// avoid a circular import: the field components need `useFieldContext`, and
// `use-app-form.ts` needs the field components to build `useAppForm`.
export const { fieldContext, useFieldContext, formContext, useFormContext } = createFormHookContexts()
