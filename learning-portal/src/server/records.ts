import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireUser, audit } from '@/auth/server'
import { trackEvent } from '@/lib/track-event'
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord } from '@/data/records'

export const recordStatusValues = ['draft', 'active', 'done', 'archived'] as const

/**
 * Shared Zod schema for the record form (used by both the server functions
 * below and the create/edit routes via TanStack Form's `validators.onSubmit`).
 */
// Every field's INPUT type is a plain (non-optional) string, matching the
// shape of a TanStack Form's default values exactly — that's required for
// `validators.onSubmit: recordInputSchema` to type-check against the form.
// Coercion/nullability happens only in the OUTPUT (via `.transform`).
export const recordInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  status: z.enum(recordStatusValues),
  owner: z.string().trim().min(1, 'Owner is required').max(120),
  amount: z
    .string()
    .refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0, 'Amount must be 0 or more')
    .transform((v) => Number(v).toFixed(2)),
  dueDate: z.string().transform((v) => (v ? v : null)),
  notes: z
    .string()
    .max(2000)
    .transform((v) => (v ? v : null)),
})

export type RecordFormValues = z.input<typeof recordInputSchema>

const idInput = z.object({ id: z.string().uuid() })

/**
 * createServerFn wrappers around `src/data/records.ts`.
 *
 * Route loaders/actions call these (not `data/records.ts` directly) because
 * `data/records.ts` imports the Drizzle/Postgres driver, which is Node-only.
 * `createServerFn` lets the TanStack Start compiler split that out of the
 * client bundle and replace it with a thin RPC call.
 *
 * Every mutation calls `requireUser()` before touching data — this is the
 * real authorization boundary. The `_app.tsx` route guard is a UX
 * convenience, not the security layer.
 */
export const listRecordsServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireUser()
  return listRecords()
})

export const getRecordServer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireUser()
    const record = await getRecord(data.id)
    if (!record) throw new Error('404: record not found')
    return record
  })

export const createRecordServer = createServerFn({ method: 'POST' })
  .validator(recordInputSchema)
  .handler(async ({ data }) => {
    await requireUser()
    const record = await createRecord(data)
    await audit('record.created', 'record', record.id, null, record)
    await trackEvent('record_created', { id: record.id })
    return record
  })

export const updateRecordServer = createServerFn({ method: 'POST' })
  .validator(recordInputSchema.partial().extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireUser()
    const { id, ...patch } = data
    const before = await getRecord(id)
    const record = await updateRecord(id, patch)
    if (!record) throw new Error('404: record not found')
    await audit('record.updated', 'record', id, before ?? null, record)
    await trackEvent('record_updated', { id })
    return record
  })

export const deleteRecordServer = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireUser()
    const before = await getRecord(data.id)
    // Soft delete (see src/data/records.ts) — `deleted` is the row with
    // `deletedAt` now set, not `null`, since the row still exists.
    const deleted = await deleteRecord(data.id)
    if (!deleted) throw new Error('404: record not found')
    await audit('record.deleted', 'record', data.id, before ?? null, deleted)
    await trackEvent('record_deleted', { id: data.id })
    return { id: data.id }
  })
