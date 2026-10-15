/**
 * Inserts the sample jobs, applications and notes (src/data/demo/recruiting.ts)
 * into a real database. Run with `npm run db:seed` (wraps this in
 * `netlify dev:exec` so NETLIFY_DB_URL is available). Safe to re-run: uses
 * `onConflictDoNothing` keyed on the fixed seed UUIDs.
 */
import { drizzle } from 'drizzle-orm/netlify-db'
import { applicationNotes, applications, jobs } from '../src/db/schema'
import { seedApplications, seedJobs, seedNotes } from '../src/data/demo/recruiting'

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error(
      'NETLIFY_DB_URL is not set. Run `netlify database init` first, then re-run `npm run db:seed`.',
    )
    process.exit(1)
  }

  const db = drizzle()

  // Parents first: applications reference jobs, notes reference applications.
  const insertedJobs = await db
    .insert(jobs)
    .values(seedJobs)
    .onConflictDoNothing({ target: jobs.id })
    .returning()
  const insertedApplications = await db
    .insert(applications)
    .values(seedApplications)
    .onConflictDoNothing({ target: applications.id })
    .returning()
  const insertedNotes = await db
    .insert(applicationNotes)
    .values(seedNotes)
    .onConflictDoNothing({ target: applicationNotes.id })
    .returning()

  console.log(
    `Seeded ${insertedJobs.length} job(s), ${insertedApplications.length} application(s) and ` +
      `${insertedNotes.length} note(s); existing rows were skipped.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
