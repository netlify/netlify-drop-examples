/**
 * Loads the synthetic demo dataset (src/data/demo/seed.ts) into a real
 * database as a `seed` batch under the `system` role. Run with
 * `npm run db:seed` (wraps this in `netlify dev:exec` so NETLIFY_DB_URL is
 * available). Requires DATA_ENCRYPTION_KEY. Each run is a full replace, like
 * any other load.
 */
import { ingestBatch } from '../src/data/datasets'
import { seedArrSnapshots, seedOpportunities } from '../src/data/demo/seed'

async function main() {
  if (!process.env.NETLIFY_DB_URL) {
    console.error(
      'NETLIFY_DB_URL is not set. Run `netlify database init` first, then re-run `npm run db:seed`.',
    )
    process.exit(1)
  }
  // The data layer's demo branch keys off SITE_ID/SITE_NAME; make sure this
  // script always takes the database path.
  process.env.SITE_ID ||= 'seed-script'

  const opps = seedOpportunities()
  const snaps = seedArrSnapshots()
  await ingestBatch('opportunities', opps, { source: 'seed', role: 'system' })
  await ingestBatch('arr_snapshots', snaps, { source: 'seed', role: 'system' })
  console.log(`Seeded ${opps.length} opportunities and ${snaps.length} ARR snapshots.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
