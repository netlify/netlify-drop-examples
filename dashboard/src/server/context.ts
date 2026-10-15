import { createServerFn } from '@tanstack/react-start'
import { useRouteContext } from '@tanstack/react-router'
import {
  getIdentityUsersUrl,
  isAuthEnabled,
  isDataEncryptionKeySet,
  isDemoMode,
  isDeployed,
  isOfficialDemoSite,
  isSalesforceEnabled,
  isSnowflakeEnabled,
} from '@/config/flags'
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
  // Setup state for the Finish setting up checklist. Booleans only.
  encryptionKeySet: boolean
  snowflakeEnabled: boolean
  salesforceEnabled: boolean
  identityUsersUrl: string | null
  user: AppContextUser | null
}

/**
 * The only place feature flags cross the server/client boundary. Flags are
 * never exposed via `VITE_*`/`import.meta.env` (that would bake them into
 * the public client bundle) — instead the root route's `beforeLoad` calls
 * this server function once per navigation and stores the result in router
 * context, which client components read via `useAppContext()`.
 */
export const getAppContext = createServerFn({ method: 'GET' }).handler(async (): Promise<AppContext> => {
  const authEnabled = isAuthEnabled()
  const demoMode = isDemoMode()
  const sessionUser = authEnabled ? await getSessionUser() : null
  const user: AppContextUser | null = sessionUser
    ? { id: sessionUser.id, email: sessionUser.email, name: sessionUser.name, roles: sessionUser.roles ?? [] }
    : demoMode
      ? {
          id: 'demo-user',
          email: 'demo@example.com',
          name: 'Demo User',
          roles: [appConfig.adminRole],
        }
      : null
  return {
    authEnabled,
    demoMode,
    deployed: isDeployed(),
    officialDemoSite: isOfficialDemoSite(),
    encryptionKeySet: isDataEncryptionKeySet(),
    snowflakeEnabled: isSnowflakeEnabled(),
    salesforceEnabled: isSalesforceEnabled(),
    identityUsersUrl: authEnabled ? getIdentityUsersUrl() : null,
    user,
  }
})

/** Reads the app context previously resolved by the root route's `beforeLoad`. */
export function useAppContext(): AppContext {
  return useRouteContext({ from: '__root__' }) as AppContext
}
