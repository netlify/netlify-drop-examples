import { isAuthEnabled, isDemoMode } from '@/config/flags'
import { appConfig } from '@/config/app'
import { getSessionUser, type SessionUser } from '@/auth/session'
import { resolveDbRole, type DbRole } from '@/db/rls'

export type DataAccess = { user: SessionUser | null; dbRole: DbRole }

/** Roles that may view the dashboard. */
export const dashboardRoles = [appConfig.roles.viewer, appConfig.roles.editor, appConfig.roles.admin]

/**
 * Decides whether the caller may touch dataset data and with which database
 * role (for RLS). Returns the access, or a plain reason string for a denial —
 * callers translate that into a thrown error (server functions) or a
 * `Response` (raw functions), since neither style fits both.
 *
 * Fails CLOSED on a real deployment: confidential data is never served when
 * Identity isn't enabled. Demo mode (synthetic in-memory data) keeps the
 * zero-setup "auth off means open" behavior, but still enforces roles when a
 * fake session is configured via `AUTH_DEV_USER`.
 */
export async function resolveDataAccess(
  allowedRoles: Array<string>,
): Promise<{ ok: true; access: DataAccess } | { ok: false; status: 401 | 403; reason: string }> {
  if (!isAuthEnabled()) {
    if (isDemoMode()) return { ok: true, access: { user: null, dbRole: 'admin' } }
    return {
      ok: false,
      status: 403,
      reason:
        'Netlify Identity must be enabled before this app serves data. See README > Data classification (Tier 2).',
    }
  }
  const user = await getSessionUser()
  if (!user) return { ok: false, status: 401, reason: 'Sign in to continue.' }
  const roles = user.roles ?? []
  const dbRole = resolveDbRole(roles)
  if (!dbRole || !allowedRoles.some((r) => roles.includes(r))) {
    return { ok: false, status: 403, reason: `You need one of these roles: ${allowedRoles.join(', ')}.` }
  }
  return { ok: true, access: { user, dbRole } }
}
