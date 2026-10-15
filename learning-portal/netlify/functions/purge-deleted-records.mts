import type { Config } from '@netlify/functions'
import { isPurgeEnabled, getRetentionDays } from '../../src/config/flags'
import { purgeExpiredRecords } from '../../src/data/records'

/**
 * Reference purge job for the `records` entity — copy this pattern for any
 * other entity that opts into soft delete. No-ops entirely unless
 * `PURGE_ENABLED=true`; `RECORD_RETENTION_DAYS` is only read (and only
 * required) once purge is actually turned on. See README > Soft delete.
 *
 * Imports only from `src/config/flags` and `src/data/records` — not
 * `src/auth/server.ts` — for the same bundle-size reason `checkRole` was
 * split into `src/auth/session.ts`: `server.ts` pulls in
 * `@tanstack/react-router` via `requireUser()`'s `redirect()`, which this
 * function has no use for.
 */
export default async (_req: Request) => {
  if (!isPurgeEnabled()) {
    return Response.json({ ok: true, skipped: 'PURGE_ENABLED is not true' })
  }
  const purged = await purgeExpiredRecords(getRetentionDays())
  return Response.json({ ok: true, purged: purged.length })
}

export const config: Config = {
  schedule: '0 3 * * *', // daily at 03:00 UTC — adjust per vertical
}
