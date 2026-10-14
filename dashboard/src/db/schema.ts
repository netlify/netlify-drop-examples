import { pgTable, uuid, text, integer, date, timestamp, jsonb, index, primaryKey } from 'drizzle-orm/pg-core'
import { softDeleteColumns } from '@/db/soft-delete'

/**
 * A JSON value with no `unknown` members. `createServerFn` (TanStack Start)
 * statically verifies every server function return value is serializable —
 * plain `jsonb(...)` columns without a `.$type<...>()` annotation infer as
 * `unknown`, which fails that check even though the runtime value is always
 * JSON. Using this type on jsonb columns keeps the columns dynamically
 * shaped (any JSON) while satisfying the serializability check.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Array<Json>

/**
 * Drizzle schema — the single source of truth for the database shape.
 *
 * To add a new entity: add a table here, run `npm run db:generate` to emit a
 * migration, then create `src/data/<entity>.ts` following the pattern in
 * `src/data/datasets.ts`.
 *
 * Demo mode never touches this file's tables directly — it reuses the
 * `$inferSelect` types below so demo data and real rows can never drift out
 * of shape.
 */

export const datasetBatches = pgTable(
  'dataset_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dataset: text('dataset').notNull(), // opportunities | arr_snapshots
    source: text('source').notNull(), // csv | snowflake | salesforce | seed
    rowCount: integer('row_count').notNull(),
    blobKey: text('blob_key'),
    createdById: text('created_by_id'),
    createdByEmail: text('created_by_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    // Every load is a full replace: the previous active batch is soft-deleted
    // (see src/db/soft-delete.ts) and the purge job hard-deletes it later.
    ...softDeleteColumns,
  },
  (table) => [index('dataset_batches_dataset_deleted_at_idx').on(table.dataset, table.deletedAt)],
)

export type DatasetBatch = typeof datasetBatches.$inferSelect
export type NewDatasetBatch = typeof datasetBatches.$inferInsert

// `*_enc` columns hold AES-256-GCM ciphertext (src/lib/crypto.ts) — the
// person-attributable `owner` and the dollar figures are never plaintext at rest.
export const opportunities = pgTable(
  'opportunities',
  {
    batchId: uuid('batch_id')
      .notNull()
      .references(() => datasetBatches.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    ownerEnc: text('owner_enc').notNull(),
    stage: text('stage').notNull(),
    amountEnc: text('amount_enc').notNull(),
    createdDate: date('created_date').notNull(),
    closeDate: date('close_date').notNull(),
    segment: text('segment').notNull(),
    source: text('source').notNull(),
    status: text('status').notNull(), // open | won | lost
  },
  (table) => [primaryKey({ columns: [table.batchId, table.id] })],
)

export const arrSnapshots = pgTable(
  'arr_snapshots',
  {
    batchId: uuid('batch_id')
      .notNull()
      .references(() => datasetBatches.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    month: date('month').notNull(),
    arrEnc: text('arr_enc').notNull(),
  },
  (table) => [primaryKey({ columns: [table.batchId, table.accountId, table.month] })],
)

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  path: text('path'),
  actorId: text('actor_id'),
  actorEmail: text('actor_email'),
  props: jsonb('props').$type<Json>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: text('actor_id'),
  actorEmail: text('actor_email'),
  action: text('action').notNull(), // e.g. record.created, record.updated, record.deleted
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  before: jsonb('before').$type<Json>(),
  after: jsonb('after').$type<Json>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
