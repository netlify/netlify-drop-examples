import { createServerFn } from '@tanstack/react-start'
import { useRouteContext } from '@tanstack/react-router'
import { isAuthEnabled, isDeployed, isDemoMode, isOfficialDemoSite } from '@/config/flags'
import { getSessionUser } from '@/auth/server'
import { DEMO_SESSION_USER } from '@/auth/session'

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

// Stand-in user whenever auth is off — see `DEMO_SESSION_USER`
// (src/auth/session.ts) for why that's safe: cosmetic only, never read by an
// authorization check. It also covers a deployed fork that hasn't enabled
// Identity yet (which is on the real database, so it can't be keyed on demo
// mode).

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
  const effectiveUser = sessionUser ?? (!authEnabled ? DEMO_SESSION_USER : null)
  const user: AppContextUser | null = effectiveUser
    ? {
        id: effectiveUser.id,
        email: effectiveUser.email,
        name: effectiveUser.name,
        roles: effectiveUser.roles ?? [],
      }
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
