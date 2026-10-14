import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { updateUser } from '@netlify/identity'
import { useAppContext } from '@/server/context'
import { appConfig } from '@/config/app'
import { signOut } from '@/auth/client'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
} from 'app-packs-ui'
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from '@/components/ui/field'
import { useSubmission } from '@/lib/submission'

export const Route = createFileRoute('/_app/settings')({
  component: SettingsPage,
})

// Looks up the display label (src/config/app.ts) for whichever of the
// user's roles has one — same lookup app-shell.tsx does for the nav badge.
function roleLabelFor(roles: string[]): string | null {
  const labels: Record<string, string> = appConfig.roleLabels
  const role = roles.find((r) => r in labels)
  return role ? labels[role] : null
}

function SettingsPage() {
  const { authEnabled, user } = useAppContext()

  if (!authEnabled || !user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <EmptyState
          title="Sign-in isn't turned on"
          description="There's no account to manage yet — enable Identity to add real sign-in (see the Go-live checklist)."
        />
      </div>
    )
  }

  const roleLabel = roleLabelFor(user.roles)

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {roleLabel ? <Badge variant="outline">{roleLabel}</Badge> : null}
          <Button variant="outline" size="small" onClick={() => void signOut()}>
            Log out
          </Button>
        </CardContent>
      </Card>

      <ProfileForm currentName={user.name} />
      <PasswordForm />
    </div>
  )
}

function ProfileForm({ currentName }: { currentName?: string }) {
  const [name, setName] = useState(currentName ?? '')
  const { state, run } = useSubmission(async () => {
    await updateUser({ data: { full_name: name } })
    // Router context's `user.name` won't reflect this until the next full
    // navigation (it's resolved once per navigation by the root loader —
    // see src/server/context.ts), so reload rather than leave stale text
    // showing right after a successful save.
    window.location.reload()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display name</CardTitle>
        <CardDescription>Shown in the account menu and anywhere else your name appears.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            run()
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="display-name">Name</FieldLabel>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {state.status === 'error' ? <FieldError>{state.error}</FieldError> : null}
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={state.status === 'submitting'}>
            {state.status === 'submitting' ? 'Saving...' : 'Save name'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { state, run } = useSubmission(async () => {
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match.')
    }
    await updateUser({ password })
    setPassword('')
    setConfirmPassword('')
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change the password you use to log in.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            run()
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
          <Button type="submit" disabled={state.status === 'submitting'}>
            {state.status === 'submitting' ? 'Saving...' : 'Update password'}
          </Button>
          {state.status === 'success' ? (
            <FieldDescription>Password updated.</FieldDescription>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}
