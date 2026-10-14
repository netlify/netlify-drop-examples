import type { Config } from '@netlify/functions'
import { isPurgeEnabled, getRetentionDays } from '../../src/config/flags'
import { purgeExpiredBatches } from '../../src/data/datasets'

/**
 * Purge job for replaced dataset batches (each full-replace load soft-deletes
 * the previous batch). No-ops entirely unless `PURGE_ENABLED=true`;
 * `RECORD_RETENTION_DAYS` is only read (and only required) once purge is
 * actually turned on. Rows are removed with their batch via ON DELETE
 * CASCADE. See README > Soft delete.
 *
 * Imports only from `src/config/flags` and `src/data/datasets` — not
 * `src/auth/server.ts` — for the same bundle-size reason `checkRole` was
 * split into `src/auth/session.ts`.
 */
export default async (_req: Request) => {
  if (!isPurgeEnabled()) {
    return Response.json({ ok: true, skipped: 'PURGE_ENABLED is not true' })
  }
  const purged = await purgeExpiredBatches(getRetentionDays())
  return Response.json({ ok: true, purged: purged.length })
}

export const config: Config = {
  schedule: '0 3 * * *', // daily at 03:00 UTC — adjust per vertical
}
