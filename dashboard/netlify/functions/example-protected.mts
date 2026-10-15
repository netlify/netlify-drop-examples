import type { Config } from '@netlify/functions'
import { isAuthEnabled } from '../../src/config/flags'
import { checkRole } from '../../src/auth/session'

/**
 * Reference implementation for a role-gated Netlify Function. Copy this
 * file, change the path and the `allowedRoles` array — everything else here
 * is boilerplate that should not need to change per vertical. See
 * `src/auth/session.ts`'s `checkRole()` for the underlying helper (imported
 * from there, not `src/auth/server.ts`, so this function's bundle doesn't
 * pick up TanStack Router/DB dependencies it doesn't need), and
 * `requireRole()` in `src/auth/server.ts` if you're gating a TanStack Start
 * route/server function instead of a raw Netlify Function.
 */
export default async (_req: Request) => {
  if (await isAuthEnabled()) {
    const denied = await checkRole(['admin']) // <- swap for your vertical's role(s)
    if (denied) return denied
  }

  return Response.json({ ok: true, message: 'You have the required role (or auth is off).' })
}

export const config: Config = {
  path: '/api/example-protected',
  method: 'GET',
}
