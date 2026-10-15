import { Alert, AlertDescription, AlertTitle } from 'app-packs-ui'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { IDENTITY_SETTINGS_URL } from '@/lib/dashboard-links'

/**
 * Tells everyone on a deployed copy that sign-in isn't on yet. With Identity
 * off the dashboard fails closed (see `resolveDataAccess()`), so without this
 * the deployer would just see empty pages. There's no way to tell them apart
 * from anyone else yet, so the warning can't be dismissed. It goes away on its
 * own once Identity is on. Demo mode (local dev, the official demo site) never
 * shows it: nothing there is real.
 */
export function IdentityOffBanner() {
  const { authEnabled, demoMode } = useAppContext()
  if (authEnabled || demoMode) return null

  return (
    <div className="border-b bg-background">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <Alert variant="accent">
          <AlertTitle>Sign-in isn't on yet</AlertTitle>
          <AlertDescription>
            The dashboard won't show any data until it is, and then only to the people you choose.{' '}
            <a
              href={IDENTITY_SETTINGS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Open Identity settings
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            {' · '}
            <a
              href={`${appConfig.templatePageUrl}#before-you-share`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Learn more
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
