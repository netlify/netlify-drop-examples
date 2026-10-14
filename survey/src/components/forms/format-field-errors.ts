/**
 * Normalizes a TanStack Form field's `meta.errors` into the `{ message }`
 * shape `<FieldError>` expects. Entries are usually already plain strings
 * (from a simple `z.string()...` validator), but a schema using
 * `.superRefine()`/`.transform()` (see `src/server/surveys.ts`'s
 * `questionInputSchema`) surfaces the full Zod issue object instead —
 * extract its `.message` rather than stringifying the whole object, which
 * would render as the literal text "[object Object]".
 */
export function formatFieldErrors(errors: ReadonlyArray<unknown>): Array<{ message: string }> {
  return errors.map((e) => {
    if (typeof e === 'string') return { message: e }
    if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
      return { message: (e as { message: string }).message }
    }
    return { message: String(e) }
  })
}
