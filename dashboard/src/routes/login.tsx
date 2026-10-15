import { createFileRoute, redirect } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle, Button } from 'app-packs-ui'
import { LoginForm } from '@/auth/client'
import { useAppContext } from '@/server/context'
import { IDENTITY_SETTINGS_URL } from '@/lib/dashboard-links'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    // Already signed in, or demo mode with nothing to configure: nothing to
    // do here. A deployed copy with Identity off stays on this page and
    // explains how to turn it on, instead of bouncing to the dashboard.
    if (context.user && context.authEnabled) {
      throw redirect({ to: '/' })
    }
    if (!context.authEnabled && context.demoMode) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { authEnabled } = useAppContext()

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      {authEnabled ? <LoginForm /> : <SignInOffNotice />}
    </div>
  )
}

/**
 * Shown at `/login` on a deployed copy where Identity isn't on yet, so
 * following a login link explains what's missing rather than silently landing
 * on the dashboard.
 */
function SignInOffNotice() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Let's turn on sign-in</h1>
        <p className="text-sm text-muted-foreground">
          It isn't on yet, so there's nothing to log in to. Until it is, the dashboard stays locked and shows
          no data.
        </p>
      </div>
      <Alert variant="accent">
        <AlertTitle>To turn it on</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal space-y-1 pl-5">
            <li>In the Netlify dashboard, open Identity and enable it.</li>
            <li>Come back here in about a minute. No redeploy needed.</li>
            <li>Sign up. The first person to sign up becomes the admin.</li>
          </ol>
        </AlertDescription>
      </Alert>
      <Button asChild className="w-full">
        <a href={IDENTITY_SETTINGS_URL} target="_blank" rel="noopener noreferrer">
          Open Identity settings
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </Button>
    </div>
  )
}
