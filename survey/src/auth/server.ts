import { redirect } from '@tanstack/react-router'
import { isAuthEnabled } from '@/config/flags'
import { insertAudit } from '@/data/audit'
import type { Json } from '@/db/schema'
import { getSessionUser, DEMO_SESSION_USER, type SessionUser } from '@/auth/session'

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
 * Like `requireUser()`, but in demo mode (auth off) resolves to
 * `DEMO_SESSION_USER` instead of `null` — for route code that shapes its UI
 * by viewer role (e.g. admin vs respondent survey views) or attributes a
 * mutation to "whoever's asking," and wants that to match the identity the
 * nav already shows (see `src/server/context.ts`'s `getAppContext`).
 * Never used for authorization — `requireRole()` below remains the real
 * security boundary and doesn't call this.
 */
export async function requireViewer(): Promise<SessionUser> {
  const user = await requireUser()
  return user ?? DEMO_SESSION_USER
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
 * resolution as `audit()`, just no before/after (a read has no diff).
 * No-op when auth is off, same reasoning as `audit()`.
 *
 * Action strings should end in `.viewed` (e.g. `employee-record.viewed`),
 * mirroring `audit()`'s `.created`/`.updated`/`.deleted` convention —
 * `/admin/audit` uses that suffix to badge a row as a read vs. a mutation.
 * See `src/server/example-audited-getter.ts` for a reference wiring.
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
