import { admin } from '@netlify/identity'

/**
 * Whether any Identity user has ever signed up. Two call sites need the same
 * answer — the signup hook (`netlify/functions/identity.mts`), which uses it
 * to decide whether to bootstrap the signing-up user as the site's first
 * admin, and the signup UI (`src/server/first-user.ts` /
 * `src/auth/client.tsx`), which uses it to show a "you'll become the admin"
 * notice before that happens — so there is exactly one place that calls the
 * Identity admin API for it.
 *
 * `admin.*` methods use the Netlify Functions operator token, which is only
 * available server-side (never in the browser) — this must only ever be
 * called from a Netlify Function or a TanStack Start server function.
 */
export async function hasAnyUsers(): Promise<boolean> {
  const users = await admin.listUsers({ perPage: 1 })
  return users.length > 0
}
