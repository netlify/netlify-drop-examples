import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginForm } from '@/auth/client'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    // No auth to configure, or already signed in — nothing to do here.
    if (!context.authEnabled || context.user) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <LoginForm />
    </div>
  )
}
