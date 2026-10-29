import { createServerFn } from '@tanstack/react-start'
import { useRouteContext } from '@tanstack/react-router'
import { isAuthEnabled, isDeployed, isDemoMode, isOfficialDemoSite } from '@/config/flags'
import { appConfig } from '@/config/app'
import { getSessionUser } from '@/auth/server'

// A deliberately narrow, plain-JSON view of the session user. Router
// context (and createServerFn returns) must be statically provable as
// serializable; `@netlify/identity`'s full `User` type has
// `userMetadata`/`appMetadata: Record<string, unknown>` fields that fail
// that check, and the UI only ever needs these four fields anyway.
export type AppContextUser = {
  id: string
  email?: string
  name?: string
  roles: Array<string>
}

export type AppContext = {
  authEnabled: boolean
  demoMode: boolean
  deployed: boolean
  officialDemoSite: boolean
  user: AppContextUser | null
}

// Stand-in user whenever auth is off — local dev, the demo site, AND a
// deployed fork that hasn't enabled Identity yet (which is on the real
// database, so this can't be keyed on demo mode). Cosmetic only: it makes
// the admin menu and the setup checklist render. `requireRole()` already
// no-ops when auth is off, so this grants nothing.
const DEMO_SESSION_USER: AppContextUser = {
  id: 'demo-user',
  email: appConfig.learning.demoUser.email,
  name: appConfig.learning.demoUser.name,
  roles: [appConfig.adminRole],
}

/**
 * The only place feature flags cross the server/client boundary. Flags are
 * never exposed via `VITE_*`/`import.meta.env` (that would bake them into
 * the public client bundle) — instead the root route's `beforeLoad` calls
 * this server function once per navigation and stores the result in router
 * context, which client components read via `useAppContext()`.
 */
export const getAppContext = createServerFn({ method: 'GET' }).handler(async (): Promise<AppContext> => {
  const authEnabled = await isAuthEnabled()
  const sessionUser = authEnabled ? await getSessionUser() : null
  const user: AppContextUser | null = sessionUser
    ? { id: sessionUser.id, email: sessionUser.email, name: sessionUser.name, roles: sessionUser.roles ?? [] }
    : !authEnabled
      ? DEMO_SESSION_USER
      : null
  return {
    authEnabled,
    demoMode: isDemoMode(),
    deployed: isDeployed(),
    officialDemoSite: isOfficialDemoSite(),
    user,
  }
})

/** Reads the app context previously resolved by the root route's `beforeLoad`. */
export function useAppContext(): AppContext {
  return useRouteContext({ from: '__root__' }) as AppContext
}
