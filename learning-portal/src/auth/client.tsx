import { appConfig } from '@/config/app'
import { useEffect, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
  login,
  signup,
  logout,
  oauthLogin,
  getSettings,
  handleAuthCallback,
  requestPasswordRecovery,
  updateUser,
  acceptInvite,
  MissingIdentityError,
  type AuthProvider,
  type Settings,
} from '@netlify/identity'
import { Button, Input, Alert, AlertTitle, AlertDescription, Skeleton, toast } from 'app-packs-ui'
import { Field, FieldLabel, FieldError, FieldGroup } from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { useSubmission } from '@/lib/submission'
import { needsFirstAdminServer } from '@/server/first-user'
import { friendlyAuthError } from '@/auth/errors'
import { IDENTITY_SETTINGS_URL } from '@/lib/dashboard-links'

/**
 * Runs `handleAuthCallback()` once on mount to process OAuth redirects,
 * email confirmations, password recovery, and invite links. Only meaningful
 * when auth is enabled; call unconditionally from `__root.tsx` — it no-ops
 * when there's no auth hash to process.
 */
export function useAuthCallback(authEnabled: boolean) {
  useEffect(() => {
    if (!authEnabled) return
    // An OAuth provider that refuses the login (or an invite-only site that
    // refuses an uninvited Google account) comes back with `error_description`
    // in the hash and no token, so handleAuthCallback() returns null for it.
    const hashError = new URLSearchParams(window.location.hash.substring(1)).get('error_description')
    if (hashError) {
      toast({ title: "We couldn't sign you in", description: hashError, variant: 'destructive' })
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    handleAuthCallback()
      .then((result) => {
        if (!result) return
        if (result.type === 'recovery') {
          // handleAuthCallback already redeemed the token and logged the
          // user in, but their password hasn't actually changed yet —
          // ResetPasswordForm finishes the flow with updateUser({ password }).
          window.location.href = '/reset-password?flow=recovery'
          return
        }
        if (result.type === 'invite') {
          // No session yet for invites — `token` is redeemed together with
          // the new password via acceptInvite() on the same form.
          window.location.href = `/reset-password?flow=invite&token=${encodeURIComponent(result.token ?? '')}`
          return
        }
        if (result.type === 'oauth' || result.type === 'confirmation' || result.type === 'email_change') {
          window.location.href = '/'
        }
      })
      .catch(() => {
        // handleAuthCallback() returns null when there's no auth hash, so
        // reaching here means a token was present but didn't work: usually an
        // expired or already-used confirmation, recovery or invite link.
        toast({
          title: "That link didn't work",
          description: 'It may have expired. Log in, or ask an admin for a new one.',
          variant: 'destructive',
        })
      })
  }, [authEnabled])
}

export async function logoutAndRedirect() {
  await logout()
  window.location.href = '/login'
}

const PROVIDER_LABELS: Record<AuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
  facebook: 'Facebook',
  email: 'Email',
}

// Brand marks for providers that have one in `/public`. Others show text only.
const PROVIDER_ICONS: Partial<Record<AuthProvider, string>> = {
  google: '/google.svg',
}

/**
 * Shown when `getSettings()` throws `MissingIdentityError`, so a team gets
 * a clear, upfront reason every submit will fail instead of a generic error
 * surfacing deep in a login/signup attempt.
 */
function IdentityUnavailableAlert() {
  return (
    <Alert variant="destructive">
      <AlertTitle>Identity isn't enabled for this site yet</AlertTitle>
      <AlertDescription>
        Netlify Identity itself is off - no one can log in, sign up, or reset a password until it's turned on.
        In the Netlify dashboard: Site configuration - Identity - Enable Identity. See{' '}
        <a
          href="https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/#enable-identity"
          target="_blank"
          rel="noreferrer"
        >
          Netlify's Identity setup guide
        </a>
        .
      </AlertDescription>
    </Alert>
  )
}

/**
 * Shown on the signup form when nobody has signed up yet — the account this
 * form creates becomes the site admin automatically (see
 * `netlify/functions/identity.mts`), so a non-technical deployer knows what
 * they're about to do instead of discovering it later. Stops appearing the
 * moment anyone has signed up, since a plain member from then on.
 */
function FirstAdminNotice({ confirmationRequired }: { confirmationRequired: boolean }) {
  return (
    <Alert variant="accent">
      <AlertTitle>You'll be the site admin</AlertTitle>
      <AlertDescription>
        No one has signed up yet, so this account becomes the admin.
        {confirmationRequired ? ' It happens once you confirm your email.' : ''}
      </AlertDescription>
    </Alert>
  )
}

export function LoginForm() {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'check-email'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [settings, setSettings] = useState<Settings | null>(null)
  // getSettings() is the cheapest call that confirms the dashboard toggle is
  // actually on; MissingIdentityError means every login/signup/reset attempt
  // would otherwise fail with a generic submit error.
  const [identityUnavailable, setIdentityUnavailable] = useState(false)
  const [settingsFailed, setSettingsFailed] = useState(false)
  const [needsFirstAdmin, setNeedsFirstAdmin] = useState(false)

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch((err) => {
        setSettings(null)
        setSettingsFailed(true)
        if (err instanceof MissingIdentityError) setIdentityUnavailable(true)
      })
  }, [])

  useEffect(() => {
    needsFirstAdminServer()
      .then(setNeedsFirstAdmin)
      .catch(() => setNeedsFirstAdmin(false))
  }, [])

  const { state, run } = useSubmission(async () => {
    try {
      const user = mode === 'login' ? await login(email, password) : await signup(email, password)
      // With email confirmation on, signup() sends a link and sets no
      // session; sending the person to `/` would just bounce them back here
      // with no explanation.
      if (mode === 'signup' && !user.confirmedAt) {
        setMode('check-email')
        return user
      }
      // Full reload (not router navigate): the auth session lives in
      // cookies/localStorage that the router's client-side state doesn't
      // know about, so a real navigation is required to pick it up.
      window.location.href = '/'
      return user
    } catch (err) {
      throw new Error(friendlyAuthError(err, mode === 'signup' ? 'signup' : 'login'), { cause: err })
    }
  })

  const { state: forgotState, run: runForgot } = useSubmission(async () => {
    try {
      await requestPasswordRecovery(email)
    } catch (err) {
      throw new Error(friendlyAuthError(err, 'forgot'), { cause: err })
    }
  })

  // What the dashboard's Registration settings mean for this form.
  const signupDisabled = !!settings?.disableSignup
  const confirmationRequired = settings?.autoconfirm === false

  const oauthProviders = settings
    ? (Object.keys(settings.providers) as Array<AuthProvider>).filter(
        (p) => p !== 'email' && settings.providers[p],
      )
    : []

  // Email and password is hidden only when Identity says it's off AND a
  // provider is on. `getSettings()` also reports `email: false` when the field
  // is simply missing, so with no provider to fall back on we keep the form
  // rather than risk showing nobody a way in.
  const emailEnabled = !settings || settings.providers.email || oauthProviders.length === 0
  const providerOnly = !!settings && !emailEnabled
  const settingsLoading = settings === null && !settingsFailed

  if (mode === 'check-email') {
    return (
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>. Open it to finish creating your account,
            then log in.
          </p>
        </div>
        {needsFirstAdmin ? <FirstAdminNotice confirmationRequired /> : null}
        <p className="text-center text-sm text-muted-foreground">
          If it doesn't arrive, check your spam folder or ask an admin.
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={() => setMode('login')}>
          Back to log in
        </Button>
      </div>
    )
  }

  if (mode === 'forgot') {
    return (
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {identityUnavailable ? <IdentityUnavailableAlert /> : null}

        {forgotState.status === 'success' ? (
          <div className="space-y-4 text-center text-sm">
            <p>
              Check <strong>{email}</strong> for a link to reset your password.
            </p>
            <button type="button" className="underline underline-offset-4" onClick={() => setMode('login')}>
              Back to log in
            </button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              // useSubmission re-throws after recording the error shown below.
              runForgot().catch(() => {})
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {forgotState.status === 'error' ? <FieldError>{forgotState.error}</FieldError> : null}
              </Field>
            </FieldGroup>

            <Button type="submit" className="w-full" disabled={forgotState.status === 'submitting'}>
              {forgotState.status === 'submitting' ? 'Sending...' : 'Send reset link'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <button type="button" className="underline underline-offset-4" onClick={() => setMode('login')}>
                Back to log in
              </button>
            </p>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <img src={appConfig.logo.src} alt="" width={40} height={40} className="mx-auto mb-3 size-10" />
        <h1 className="text-xl font-semibold">
          {mode === 'login' ? `Log in to ${appConfig.productName}` : `Join ${appConfig.productName}`}
        </h1>
        <p className="text-sm text-muted-foreground">{appConfig.tagline}</p>
        {signupDisabled ? (
          <p className="text-sm text-muted-foreground">
            Sign-up is by invitation only. Ask an admin to invite you.
          </p>
        ) : providerOnly ? (
          <p className="text-sm text-muted-foreground">
            Continue with your {oauthProviders.map((p) => PROVIDER_LABELS[p]).join(' or ')} account.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        )}
      </div>

      {identityUnavailable ? <IdentityUnavailableAlert /> : null}
      {needsFirstAdmin && signupDisabled && !identityUnavailable ? (
        <Alert variant="accent">
          <AlertTitle>No accounts exist yet</AlertTitle>
          <AlertDescription>
            Sign-up is off, so invite yourself from the Identity tab.{' '}
            <a
              href={IDENTITY_SETTINGS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Open Identity settings
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </AlertDescription>
        </Alert>
      ) : null}
      {needsFirstAdmin &&
      !signupDisabled &&
      !identityUnavailable &&
      (mode === 'signup' || oauthProviders.length > 0) ? (
        <FirstAdminNotice confirmationRequired={confirmationRequired && emailEnabled && mode === 'signup'} />
      ) : null}

      {settingsLoading && !identityUnavailable ? <Skeleton className="h-40 w-full" /> : null}

      {emailEnabled && !(settingsLoading && !identityUnavailable) ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            // useSubmission re-throws after recording the error shown below.
            run().catch(() => {})
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                {mode === 'login' ? (
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline underline-offset-4"
                    onClick={() => setMode('forgot')}
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {state.status === 'error' ? <FieldError>{state.error}</FieldError> : null}
            </Field>
          </FieldGroup>

          <Button type="submit" className="w-full" disabled={state.status === 'submitting'}>
            {state.status === 'submitting' ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </Button>
        </form>
      ) : null}

      {oauthProviders.length > 0 ? (
        <>
          {emailEnabled ? (
            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or continue with</span>
              <Separator className="flex-1" />
            </div>
          ) : null}
          <div className="grid gap-2">
            {oauthProviders.map((provider) => (
              <Button key={provider} type="button" variant="outline" onClick={() => oauthLogin(provider)}>
                {PROVIDER_ICONS[provider] ? (
                  <img
                    src={PROVIDER_ICONS[provider]}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4"
                    aria-hidden="true"
                  />
                ) : null}
                {providerOnly ? `Continue with ${PROVIDER_LABELS[provider]}` : PROVIDER_LABELS[provider]}
              </Button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * Shared "set a password" screen for the two Identity flows that leave a
 * token in the URL instead of landing the user straight in the app:
 *
 * - `flow=recovery` — handleAuthCallback() already redeemed the recovery
 *   token and logged the user in, but their password hasn't changed yet.
 *   Finishes with `updateUser({ password })`.
 * - `flow=invite` — no session yet; `token` (from the invite email) and the
 *   chosen password are redeemed together via `acceptInvite(token, password)`.
 *
 * Rendered by `src/routes/reset-password.tsx`, reached only via
 * `useAuthCallback`'s redirect — see `src/auth/client.tsx`.
 */
export function ResetPasswordForm() {
  const { flow, token } = useSearch({ from: '/reset-password' })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { state, run } = useSubmission(async () => {
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.')
    }
    if (flow === 'invite') {
      if (!token) throw new Error('Missing invite token — use the link from your invite email.')
      await acceptInvite(token, password)
    } else {
      await updateUser({ password })
    }
    // Full reload — see LoginForm's identical comment on why this can't be
    // a router navigate.
    window.location.href = '/'
  })

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">
          {flow === 'invite' ? 'Set your password' : 'Choose a new password'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {flow === 'invite'
            ? 'Set a password to finish creating your account.'
            : 'Enter a new password for your account.'}
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          // useSubmission re-throws after recording the error shown below.
          run().catch(() => {})
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {state.status === 'error' ? <FieldError>{state.error}</FieldError> : null}
          </Field>
        </FieldGroup>

        <Button type="submit" className="w-full" disabled={state.status === 'submitting'}>
          {state.status === 'submitting' ? 'Saving...' : 'Set password'}
        </Button>
      </form>
    </div>
  )
}
