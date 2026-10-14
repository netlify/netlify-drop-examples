import { pgTable, uuid, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
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
 * `src/data/surveys.ts`.
 *
 * Demo mode never touches this file's tables directly — it reuses the
 * `$inferSelect` types below so demo data and real rows can never drift out
 * of shape.
 */

/**
 * A single survey question. `type` is kept as a loose `string` here (not a
 * TS union) — the concrete set of valid values (`questionTypeValues`) lives
 * in `src/server/surveys.ts` alongside the Zod validation and UI options,
 * not in the storage layer.
 */
export type Question = {
  id: string
  type: string
  text: string
  // multiple_choice only
  options?: string[]
  // rating only — e.g. 5 for a 1-5 scale
  scale?: number
}

export const surveys = pgTable(
  'surveys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull().default('draft'), // draft | active | closed
    // Whether respondent identity is shown anywhere in the UI for this
    // survey's responses — set once by the admin at creation. Purely a
    // display flag: `surveyResponses` below always records
    // `respondentId`/`respondentEmail` when known, same as audit/events.
    anonymous: boolean('anonymous').notNull().default(true),
    questions: jsonb('questions').$type<Question[]>().notNull(),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...softDeleteColumns,
  },
  (table) => [index('surveys_deleted_at_idx').on(table.deletedAt)],
)

export type SurveyRow = typeof surveys.$inferSelect
export type NewSurvey = typeof surveys.$inferInsert

/**
 * A respondent's answers to one survey. `answers` maps question id to a
 * single string value regardless of question type — the selected option's
 * text for `multiple_choice`, the chosen number (as a string) for `rating`,
 * or the raw text for `free_text`. One row per respondent per survey (see
 * `getResponseForRespondent` in `src/data/survey-responses.ts`).
 */
export const surveyResponses = pgTable('survey_responses', {
  id: uuid('id').primaryKey().defaultRandom(),
  surveyId: uuid('survey_id').notNull(),
  respondentId: text('respondent_id'),
  respondentEmail: text('respondent_email'),
  answers: jsonb('answers').$type<Json>().notNull().default({}),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type SurveyResponseRow = Omit<typeof surveyResponses.$inferSelect, 'answers'> & {
  answers: Record<string, string>
}
export type NewSurveyResponse = Omit<typeof surveyResponses.$inferInsert, 'answers'> & {
  answers: Record<string, string>
}

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
  action: text('action').notNull(), // e.g. survey.created, survey.updated, survey.deleted
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  before: jsonb('before').$type<Json>(),
  after: jsonb('after').$type<Json>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
