import { createServerFn } from '@tanstack/react-start'
import { isAuthEnabled, isDemoMode } from '@/config/flags'
import { hasAnyUsers } from '@/auth/first-user'

/**
 * Whether `/login`'s signup form should show a "you'll become the site
 * admin" notice (see `src/auth/client.tsx`). True only when auth is
 * genuinely on and nobody has signed up yet — once someone has, the signup
 * hook in `netlify/functions/identity.mts` has already made them the admin,
 * so the notice should stop appearing. Off in demo mode (no real Identity to
 * ask) and whenever the admin API call itself fails, since this is only a UI
 * hint — the signup hook is the source of truth for who actually gets
 * promoted.
 */
export const needsFirstAdminServer = createServerFn({ method: 'GET' }).handler(async (): Promise<boolean> => {
  if (!isAuthEnabled() || isDemoMode()) return false

  try {
    return !(await hasAnyUsers())
  } catch {
    return false
  }
})
