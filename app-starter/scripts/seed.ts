/**
 * Inserts the demo dataset (src/data/demo/seed.ts) into a real database.
 * Run with `npm run db:seed` (wraps this in `netlify dev:exec` so
 * NETLIFY_DB_URL is available). Safe to re-run: uses `onConflictDoNothing`
 * keyed on the fixed seed UUIDs.
 */
import { drizzle } from 'drizzle-orm/netlify-db'
import { records } from '../src/db/schema'
import { seedRecords } from '../src/data/demo/seed'

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error(
      'NETLIFY_DB_URL is not set. Run `netlify database init` first, then re-run `npm run db:seed`.',
    )
    process.exit(1)
  }

  const db = drizzle()

  const inserted = await db
    .insert(records)
    .values(seedRecords)
    .onConflictDoNothing({ target: records.id })
    .returning({ id: records.id })

  console.log(`Seeded ${inserted.length} of ${seedRecords.length} record(s) (existing rows were skipped).`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
