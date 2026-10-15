import { redirect } from '@tanstack/react-router'
import { isAuthEnabled } from '@/config/flags'
import { insertAudit } from '@/data/audit'
import type { Json } from '@/db/schema'
import { getSessionUser, type SessionUser } from '@/auth/session'

export { getSessionUser }
export type { SessionUser }

/**
 * Returns the current user, or redirects to `/login` if auth is on and no
 * user is present. No-op (always returns `null`) when auth is off — route
 * loaders can call this unconditionally without an `if (authEnabled)` guard.
 */
export async function requireUser(): Promise<SessionUser | null> {
  if (!(await isAuthEnabled())) return null

  const user = await getSessionUser()
  if (!user) {
    throw redirect({ to: '/login' })
  }
  return user
}

/**
 * Throws a 403 error (rendered by `ErrorState` via the route's
 * `errorComponent`) if the current user's roles don't intersect
 * `allowedRoles`. No-op when auth is off, so gated routes stay reachable in
 * demo mode.
 *
 * For TanStack Start route loaders / server functions only — it throws a
 * router `redirect()` (via `requireUser()`) when there's no session, which
 * only a route's loader/errorComponent machinery can catch. A raw Netlify
 * Function has no router to catch that throw; use `checkRole()` from
 * `src/auth/session.ts` there instead (also avoids pulling this file's
 * TanStack Router + DB dependencies into your function's bundle).
 *
 * This has no knowledge of what role strings are valid — it only compares
 * the session's roles against whatever `allowedRoles` list is passed in.
 * Role values themselves are entirely up to the vertical built on top of
 * this base template (see README > Roles).
 */
export async function requireRole(allowedRoles: string[]): Promise<SessionUser | null> {
  if (!(await isAuthEnabled())) return null

  const user = await requireUser()
  const roles = user?.roles ?? []
  if (!allowedRoles.some((role) => roles.includes(role))) {
    throw new Error(`403: you need one of these roles to view this page: ${allowedRoles.join(', ')}.`)
  }
  return user
}

/**
 * Writes an audit log entry with the actor taken from the current session.
 * No-op when auth is off (there is no real actor to attribute the action
 * to, and demo mode has no meaningful audit trail).
 */
export async function audit(
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

/**
 * Opt-in read-level audit logging — the read counterpart to `audit()`
 * above. NOT wired into any getter automatically; call it explicitly from
 * the specific server function(s) whose reads need a trail (e.g. EEO
 * fields, attributed survey responses). Same persistence path and actor
 * resolution as `audit()`, same no-op conditions — this is one log, not a
 * parallel one, which is also why there's no `before`/`after` parameter: a
 * read has no diff to record.
 *
 * Action strings should end in `.viewed` (e.g. `employee-record.viewed`),
 * mirroring `audit()`'s `.created`/`.updated`/`.deleted` convention —
 * `/admin/audit` uses that suffix to badge a row as a read vs. a mutation.
 * See `getApplicationServer` in `src/server/recruiting.ts` for a reference wiring.
 */
export async function auditRead(action: string, entity: string, entityId: string): Promise<void> {
  if (!(await isAuthEnabled())) return

  const user = await getSessionUser()
  await insertAudit({
    actorId: user?.id ?? null,
    actorEmail: user?.email ?? null,
    action,
    entity,
    entityId,
    before: null,
    after: null,
  })
}
