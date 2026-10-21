import { createServerFn } from '@tanstack/react-start'
import { useRouteContext } from '@tanstack/react-router'
import { isAIConfigured, isDeployed, isOfficialDemoSite } from '../config/flags'

export type AppContext = {
  aiConfigured: boolean
  deployed: boolean
  officialDemoSite: boolean
}

/**
 * The only place server-side flags cross to the client. The root route's
 * `beforeLoad` calls this and stores the result in router context, which
 * components read via `useAppContext()`.
 */
export const getAppContext = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AppContext> => ({
    aiConfigured: isAIConfigured(),
    deployed: isDeployed(),
    officialDemoSite: isOfficialDemoSite(),
  }),
)

/** Reads the app context resolved by the root route's `beforeLoad`. */
export function useAppContext(): AppContext {
  return useRouteContext({ from: '__root__' }) as AppContext
}
