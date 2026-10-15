/**
 * Prints INSERT statements for the starter course catalog
 * (src/data/demo/learning-seed.ts). Used once to author the
 * starter-catalog migrations (`seed_starter_courses`, then
 * `replace_starter_courses`) so a freshly deployed site has courses to take
 * on day one:
 *
 *   npx drizzle-kit generate --custom --name <name>
 *   npx tsx scripts/learning-seed-sql.ts > netlify/database/migrations/<that folder>/migration.sql
 *
 * Never re-run this against an already-applied migration — write a new one.
 */
import { seedCourses, seedLessons } from '../src/data/demo/learning-seed'

const q = (v: string | null | undefined) => (v == null ? 'NULL' : `'${v.replace(/'/g, "''")}'`)

// The original catalog (ids c(1)–c(7)) was replaced; soft-delete it and its
// lessons. Only those fixed seed ids are touched, never admin-created courses.
const retiredCourseIds = Array.from(
  { length: 7 },
  (_, i) => `'22222222-2222-4222-8222-2222222222${String(i + 1).padStart(2, '0')}'`,
).join(', ')
const statements: Array<string> = [
  `UPDATE "lessons" SET "deleted_at" = now() WHERE "course_id" IN (${retiredCourseIds}) AND "deleted_at" IS NULL;`,
  `UPDATE "courses" SET "deleted_at" = now() WHERE "id" IN (${retiredCourseIds}) AND "deleted_at" IS NULL;`,
]
for (const c of seedCourses) {
  statements.push(
    `INSERT INTO "courses" ("id", "title", "summary", "description", "category", "icon", "status", "sort_order") VALUES (${q(c.id)}, ${q(c.title)}, ${q(c.summary)}, ${q(c.description)}, ${q(c.category)}, ${q(c.icon)}, ${q(c.status)}, ${c.sortOrder ?? 0}) ON CONFLICT ("id") DO NOTHING;`,
  )
}
for (const l of seedLessons) {
  statements.push(
    `INSERT INTO "lessons" ("id", "course_id", "title", "description", "resource_url", "duration_minutes", "priority", "required", "sort_order") VALUES (${q(l.id)}, ${q(l.courseId)}, ${q(l.title)}, ${q(l.description)}, ${q(l.resourceUrl)}, ${l.durationMinutes ?? 15}, ${q(l.priority)}, ${l.required ?? true}, ${l.sortOrder ?? 0}) ON CONFLICT ("id") DO NOTHING;`,
  )
}
console.log(
  '-- Replace the starter course catalog for Acme Academy (generated from src/data/demo/learning-seed.ts).',
)
console.log(statements.join('--> statement-breakpoint\n'))
