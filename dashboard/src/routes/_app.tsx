import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

/**
 * Pathless layout applied to every route under `_app/`. This is the UX
 * guard (redirect anonymous users to `/login`) — the real authorization
 * boundary is `requireUser()`/`requireRole()` inside each server function in
 * `src/server/*.ts`, which run regardless of how the client got there.
 */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => {
    if (context.authEnabled && !context.user) {
      throw redirect({ to: '/login' })
    }
  },
  component: () => <Outlet />,
})
