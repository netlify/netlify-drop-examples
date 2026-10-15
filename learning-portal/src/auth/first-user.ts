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

/**
 * Whether anyone other than `userId` has a confirmed Identity account. The
 * signup hook uses this, not `hasAnyUsers()`: with email confirmation on, the
 * hook runs when the new person confirms, by which point their own record is
 * already in Identity, so "any user exists" would always be true and the
 * first person would never become the admin. Excluding the signing-up user,
 * and ignoring accounts that never confirmed, makes the first person to
 * confirm the admin whether or not their own record is listed yet.
 *
 * Looks at the first 100 users only, which is plenty for a fresh site.
 */
export async function hasOtherConfirmedUser(userId: string): Promise<boolean> {
  const users = await admin.listUsers({ perPage: 100 })
  return users.some((user) => user.id !== userId && !!user.confirmedAt)
}
