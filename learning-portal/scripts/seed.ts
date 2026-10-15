/**
 * Inserts the demo dataset (src/data/demo/seed.ts) into a real database.
 * Run with `npm run db:seed` (wraps this in `netlify dev:exec` so
 * NETLIFY_DB_URL is available). Safe to re-run: uses `onConflictDoNothing`
 * keyed on the fixed seed UUIDs.
 */
import { getDb } from '../src/db/client'
import { records, courses, lessons } from '../src/db/schema'
import { seedRecords } from '../src/data/demo/seed'
import { seedCourses, seedLessons } from '../src/data/demo/learning-seed'

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error(
      'NETLIFY_DB_URL is not set. Run `netlify database init` first, then re-run `npm run db:seed`.',
    )
    process.exit(1)
  }

  const db = getDb()

  const inserted = await db
    .insert(records)
    .values(seedRecords)
    .onConflictDoNothing({ target: records.id })
    .returning({ id: records.id })

  console.log(`Seeded ${inserted.length} of ${seedRecords.length} record(s) (existing rows were skipped).`)

  // The starter catalog is also inserted by the `seed_starter_courses`
  // migration; this keeps `npm run db:seed` a complete, idempotent reseed.
  const insertedCourses = await db
    .insert(courses)
    .values(seedCourses)
    .onConflictDoNothing({ target: courses.id })
    .returning({ id: courses.id })
  const insertedLessons = await db
    .insert(lessons)
    .values(seedLessons)
    .onConflictDoNothing({ target: lessons.id })
    .returning({ id: lessons.id })
  console.log(
    `Seeded ${insertedCourses.length} of ${seedCourses.length} course(s) and ${insertedLessons.length} of ${seedLessons.length} lesson(s).`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
