import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireUser, auditRead } from '@/auth/server'

/**
 * Reference implementation for a read-audited getter. Copy this file,
 * replace the fetch below with your sensitive entity's real getter (e.g.
 * EEO fields, attributed survey responses) and swap `'employee-record'`
 * for its entity name — everything else here is boilerplate that
 * shouldn't need to change per vertical.
 *
 * Deliberately synthetic (no `src/data/records.ts` import): `records` is
 * reference demo data, not sensitive, and copying this pattern onto it
 * would be wrong — see README > Audit logging.
 *
 * `auditRead(action, entity, entityId)` (`src/auth/server.ts`) is the
 * opt-in read-log counterpart to the existing `audit()` mutation logger —
 * same persistence/actor resolution, just no before/after.
 */
const idInput = z.object({ id: z.string().uuid() })

export const getSensitiveEntityServer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireUser()
    const entity = await fetchYourSensitiveEntity(data.id) // <- replace with your real getter
    await auditRead('employee-record.viewed', 'employee-record', data.id) // <- swap for your entity
    return entity
  })

// Placeholder standing in for your vertical's real data-layer getter —
// delete this once you point the handler above at the real thing (see
// src/data/records.ts for the demo/DB-branch pattern this app uses
// elsewhere for a getter).
async function fetchYourSensitiveEntity(id: string) {
  return { id }
}
