import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
  jsonb,
  index,
  integer,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
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

// ---------------------------------------------------------------------------
// Learning (LMS) entities
// ---------------------------------------------------------------------------

/**
 * A course is an ordered collection of lessons (the "section" in an
 * onboarding checklist). Only `published` courses are visible to learners;
 * `draft` courses are visible to course managers only.
 */
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    description: text('description'),
    category: text('category').notNull().default('General'),
    // Key into the course icon map in `src/components/learning/course-icon.tsx`.
    icon: text('icon').notNull().default('book'),
    status: text('status').notNull().default('draft'), // draft | published
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...softDeleteColumns,
  },
  (table) => [index('courses_deleted_at_idx').on(table.deletedAt)],
)

export type Course = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert

/** A single learning task inside a course — read, watch, or complete something. */
export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id),
    title: text('title').notNull(),
    description: text('description'),
    resourceUrl: text('resource_url'),
    durationMinutes: integer('duration_minutes').notNull().default(15),
    priority: text('priority').notNull().default('medium'), // high | medium | low
    required: boolean('required').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...softDeleteColumns,
  },
  (table) => [
    index('lessons_course_id_idx').on(table.courseId),
    index('lessons_deleted_at_idx').on(table.deletedAt),
  ],
)

export type Lesson = typeof lessons.$inferSelect
export type NewLesson = typeof lessons.$inferInsert

/**
 * One row per (learner, lesson). Unchecking a lesson clears `completedAt`
 * rather than deleting the row, so progress history is never destroyed.
 * Learner email/name are denormalized from the session so the team progress
 * report works without calling the Identity admin API.
 */
export const lessonProgress = pgTable(
  'lesson_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    userEmail: text('user_email'),
    userName: text('user_name'),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('lesson_progress_user_lesson_idx').on(table.userId, table.lessonId),
    index('lesson_progress_lesson_id_idx').on(table.lessonId),
  ],
)

export type LessonProgress = typeof lessonProgress.$inferSelect
export type NewLessonProgress = typeof lessonProgress.$inferInsert
