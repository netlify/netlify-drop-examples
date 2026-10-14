import { getUser, type User } from '@netlify/identity'
import { isAuthEnabled } from '@/config/flags'
import { appConfig } from '@/config/app'

export type SessionUser = User

/**
 * Cosmetic-only stand-in identity used whenever auth is off (demo mode), so
 * the app has a consistent "you're exploring as HR Admin" viewer across the
 * nav (`src/server/context.ts`'s `getAppContext`) and any route that shapes
 * its UI or attributes a mutation by viewer role/identity (`requireViewer()`
 * in `src/auth/server.ts`). Every field but `id` is optional on `User`, so
 * this is a fully valid `SessionUser`. Purely cosmetic —
 * `requireRole()`/`checkRole()` (the real authorization boundary) gate on
 * `isAuthEnabled()`/the real session and never read this.
 */
export const DEMO_SESSION_USER: SessionUser = {
  id: 'demo-admin',
  email: 'demo.admin@pulse.example',
  name: 'Demo Admin',
  roles: [appConfig.adminRole],
}

/**
 * Resolves the current session user. Three explicit branches:
 *
 * 1. Auth is off (Identity is not enabled for the linked Netlify project) ->
 *    always `null`. The rest of the app treats a `null` user as "no auth
 *    required", not "logged out".
 * 2. Local dev override -> when running under `netlify dev` (so
 *    `NETLIFY_DEV === 'true'`) and `AUTH_DEV_USER` is set to a JSON blob
 *    like `{"email":"you@example.com","roles":["admin"]}`, auth turns on
 *    and that fake user is used. This exists because `@netlify/identity`
 *    does not work locally (there is no real Identity endpoint to talk to
 *    outside a deploy).
 * 3. Otherwise -> defer to `@netlify/identity`'s isomorphic `getUser()`,
 *    which reads the `nf_jwt` cookie from the incoming request and returns
 *    an already-normalized `{ id, email, name, roles, ... }` object (or
 *    `null`).
 *
 * This file deliberately has NO dependency on `@tanstack/react-router` or
 * `src/data/*.ts` (unlike `src/auth/server.ts`, which needs both for
 * `requireUser`'s redirect and `audit`'s DB write). Netlify Functions that
 * only need a role check should import `checkRole`/`getSessionUser` from
 * here, not from `src/auth/server.ts` — importing the latter drags an
 * unrelated TanStack Router + Drizzle/Postgres dependency graph into every
 * function that imports it, even if it never calls `requireUser`/`audit`.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!(await isAuthEnabled())) {
    return null
  }

  if (process.env.NETLIFY_DEV === 'true' && process.env.AUTH_DEV_USER) {
    try {
      const parsed = JSON.parse(process.env.AUTH_DEV_USER) as Partial<User>
      return {
        id: parsed.id ?? 'dev-user',
        email: parsed.email,
        name: parsed.name ?? parsed.email,
        roles: parsed.roles ?? [],
      } as SessionUser
    } catch {
      console.warn('AUTH_DEV_USER is set but is not valid JSON — ignoring it.')
    }
  }

  return getUser()
}

/**
 * Role check for raw Netlify Functions (as opposed to TanStack Start route
 * loaders/server functions, which use `requireRole` from `src/auth/server.ts`
 * instead): returns a `Response` instead of throwing, since a Netlify
 * Function has no router to catch a thrown redirect or error. `null` means
 * "authorized, proceed"; a `Response` means "return this immediately." Has
 * no `isAuthEnabled()` gate of its own — call it after your own auth gate
 * (see `netlify/functions/upload.mts` for the pattern, and
 * `netlify/functions/example-protected.mts` for a full reference usage).
 *
 * This has no knowledge of what role strings are valid — it only compares
 * the session's roles against whatever `allowedRoles` list is passed in.
 * Role values themselves are entirely up to the vertical built on top of
 * this base template (see README > Roles).
 */
export async function checkRole(allowedRoles: string[]): Promise<Response | null> {
  const user = await getSessionUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const roles = user.roles ?? []
  if (!allowedRoles.some((role) => roles.includes(role))) {
    return new Response('Forbidden', { status: 403 })
  }

  return null
}
