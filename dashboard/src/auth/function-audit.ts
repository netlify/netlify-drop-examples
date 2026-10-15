import { isAuthEnabled } from '@/config/flags'
import { insertAudit } from '@/data/audit'
import { getSessionUser } from '@/auth/session'
import type { Json } from '@/db/schema'

/**
 * Audit helper for raw Netlify Functions. `audit()` in `src/auth/server.ts`
 * does the same job but that file imports TanStack Router, which functions
 * must not pull into their bundle — so this wraps `insertAudit` with the
 * session user directly. Same no-op conditions as `audit()` (auth off).
 */
export async function auditFromFunction(
  action: string,
  entity: string,
  entityId: string,
  before?: unknown,
  after?: unknown,
): Promise<void> {
  if (!(await isAuthEnabled())) return
  const user = await getSessionUser()
  await insertAudit({
    actorId: user?.id ?? null,
    actorEmail: user?.email ?? null,
    action,
    entity,
    entityId,
    before: (before as Json | undefined) ?? null,
    after: (after as Json | undefined) ?? null,
  })
}
