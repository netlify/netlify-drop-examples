import { pgTable, uuid, text, numeric, date, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
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
 * `src/data/records.ts`.
 *
 * Demo mode never touches this file's tables directly — it reuses the
 * `$inferSelect` types below so demo data and real rows can never drift out
 * of shape.
 */

export const records = pgTable(
  'records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    status: text('status').notNull().default('draft'), // draft | active | done | archived
    owner: text('owner').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull().default('0'),
    dueDate: date('due_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Soft-delete convention — see src/db/soft-delete.ts. Every list/get/purge
    // query filters on this column, hence the index.
    ...softDeleteColumns,
  },
  (table) => [index('records_deleted_at_idx').on(table.deletedAt)],
)

// Named `RecordRow` (not `Record`) to avoid shadowing TypeScript's built-in
// `Record<K, V>` utility type used elsewhere in this file and the app.
export type RecordRow = typeof records.$inferSelect
export type NewRecord = typeof records.$inferInsert

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

export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(), department: text('department').notNull(), location: text('location').notNull(),
  employmentType: text('employment_type').notNull(), description: text('description').notNull(),
  responsibilities: text('responsibilities').notNull(), qualifications: text('qualifications').notNull(),
  benefits: text('benefits').notNull(), status: text('status').notNull().default('open'),
  postedDate: date('posted_date').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), ...softDeleteColumns,
}, (table) => [index('jobs_deleted_at_idx').on(table.deletedAt)])
export type Job = typeof jobs.$inferSelect
export type NewJob = typeof jobs.$inferInsert

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(), jobId: uuid('job_id').notNull().references(() => jobs.id),
  candidateName: text('candidate_name').notNull(), email: text('email').notNull(), resumeKey: text('resume_key').notNull(),
  resumeName: text('resume_name').notNull(), coverLetter: text('cover_letter').notNull(), status: text('status').notNull().default('new'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(), ...softDeleteColumns,
}, (table) => [index('applications_job_id_idx').on(table.jobId), index('applications_deleted_at_idx').on(table.deletedAt)])
export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert

export const applicationNotes = pgTable('application_notes', {
  id: uuid('id').primaryKey().defaultRandom(), applicationId: uuid('application_id').notNull().references(() => applications.id),
  content: text('content').notNull(), author: text('author').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  ...softDeleteColumns,
}, (table) => [index('application_notes_application_id_idx').on(table.applicationId), index('application_notes_deleted_at_idx').on(table.deletedAt)])
export type ApplicationNote = typeof applicationNotes.$inferSelect
export type NewApplicationNote = typeof applicationNotes.$inferInsert
