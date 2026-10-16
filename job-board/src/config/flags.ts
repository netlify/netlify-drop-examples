import { getIdentityConfig } from '@netlify/identity'
import { appConfig } from '@/config/app'

/**
 * Server-only feature flag helpers.
 *
 * IMPORTANT: always read `process.env` INSIDE these functions, never hoist
 * values to module scope. Some server runtimes reuse a module across
 * requests/invocations with different env, and reading at module load time
 * can bake in a stale value.
 *
 * These flags never flow to the client via `import.meta.env` / `VITE_*`
 * (that would bake them into the public client bundle). Instead the root
 * route's `beforeLoad` calls `getAppContext()` (see src/server/context.ts)
 * and puts the resolved booleans into router context for client code to read
 * via `useAppContext()`.
 */

/**
 * True on a real Netlify deploy (production, previews, branch deploys), false
 * on a laptop — including when the repo (or any folder above it) is linked to
 * a site, which sets `SITE_ID` too. `netlify dev` marks that with
 * `NETLIFY_DEV`; plain `npm run dev` (the Netlify Vite plugin) sets
 * `NETLIFY_LOCAL` and loads the linked site's environment (`SITE_ID`
 * included), and `NODE_ENV` is `development` under vite dev as a backstop,
 * so all three are checked.
 *
 * Only `SITE_ID` (and those local markers) work here. `CONTEXT` and
 * `NETLIFY` are build-time-only variables and are undefined inside the
 * deployed function.
 */
export function isDeployed(): boolean {
  return (
    !!process.env.SITE_ID &&
    process.env.NETLIFY_DEV !== 'true' &&
    process.env.NETLIFY_LOCAL !== 'true' &&
    process.env.NODE_ENV !== 'development'
  )
}

/** True only on the canonical public demo project (`appConfig.officialDemoSiteId`). */
export function isOfficialDemoSite(): boolean {
  return process.env.SITE_ID === appConfig.officialDemoSiteId
}

/**
 * Whether the app runs on in-memory sample data instead of Netlify Database.
 * Derived from the environment — there is deliberately NO env var for it, so
 * a stray `DEMO_MODE=true` can never silently put a deployed fork back on
 * sample data.
 *
 * - Local development, including a linked `netlify dev`, uses sample data, so
 *   `npm install && npm run dev` stays zero-config and tests stay in-memory.
 * - The official demo site uses sample data so visitors can explore without
 *   Identity or a database.
 * - Every other deploy, previews and branch deploys included, uses Netlify
 *   Database, which Netlify provisions and migrates on deploy.
 *
 * This deliberately does NOT infer anything from NETLIFY_DB_URL.
 * @netlify/database can auto-provision a local Postgres database (and set
 * NETLIFY_DB_URL) in dev merely because the package is a dependency, before
 * you've ever applied a single migration.
 */
export function isDemoMode(): boolean {
  return !isDeployed() || isOfficialDemoSite()
}

// How long to remember whether Identity is on. Enabling it in the dashboard
// takes effect within a minute, without a redeploy. Keyed by Identity URL so a
// cached answer can never leak across sites. Only definitive answers are
// cached, never errors.
const IDENTITY_CHECK_TTL_MS = 60_000
const identityChecks = new Map<string, { enabled: boolean; expires: number }>()

/** Test hook: forget remembered Identity lookups. */
export function clearAuthEnabledCache(): void {
  identityChecks.clear()
}

/**
 * Whether Netlify Identity is turned on for this project, asked of the
 * platform itself rather than an env var.
 *
 * `getIdentityConfig()` alone can't tell: on the server it returns the site's
 * Identity URL whenever the code runs on Netlify, enabled or not. So we ask
 * the Identity settings endpoint. Netlify answers 200 with JSON when Identity
 * is on and 404 when it's off.
 *
 * Fails closed: if the endpoint can't be reached or answers anything else
 * (5xx, a password-protected deploy's 401, a network error), this returns
 * `true`, because `requireRole()` and friends no-op when auth is off and a
 * transient error must never open the app up. Failures aren't cached.
 */
export async function isAuthEnabled(): Promise<boolean> {
  if (process.env.NETLIFY_DEV === 'true' && process.env.AUTH_DEV_USER) {
    return true
  }

  if (isDemoMode()) {
    return false
  }

  const url = getIdentityConfig()?.url
  if (!url) {
    return false
  }

  const cached = identityChecks.get(url)
  if (cached && cached.expires > Date.now()) {
    return cached.enabled
  }

  try {
    const response = await fetch(`${url}/settings`, { headers: { accept: 'application/json' } })
    if (response.status === 404) {
      identityChecks.set(url, { enabled: false, expires: Date.now() + IDENTITY_CHECK_TTL_MS })
      return false
    }
    if (response.ok) {
      identityChecks.set(url, { enabled: true, expires: Date.now() + IDENTITY_CHECK_TTL_MS })
      return true
    }
    console.warn(`Identity settings check returned ${response.status}; treating Identity as enabled.`)
  } catch (error) {
    console.warn('Identity settings check failed; treating Identity as enabled.', error)
  }
  return true
}

/**
 * The email domain new signups must match (see
 * `netlify/functions/identity.mts`), or `undefined` for no restriction.
 * Optional, not fail-loud: the signup hook has no way to tell whether
 * Identity's own "open signups" setting is even on, so it can't force a
 * vertical to configure this. Unset (the default) means unrestricted — correct for an
 * invite-only setup, where every signup already comes from a trusted
 * invite. Matching is exact-domain only (`acme.com`, not `*.acme.com`) —
 * comparison is done against the literal string after `@`, so a
 * subdomain-based email is rejected unless you list it explicitly.
 */
export function getAllowedSignupDomain(): string | undefined {
  const value = process.env.ALLOWED_SIGNUP_DOMAIN?.trim().toLowerCase()
  return value ? value : undefined
}

/**
 * Connection details for Netlify Database, read from the env vars Netlify
 * sets on every deploy. `NETLIFY_DB_URL` is provisioned by the platform
 * (`@netlify/database`), never by hand. `NETLIFY_DB_DRIVER=server` means a
 * plain TCP Postgres connection (local `netlify dev`); anything else uses the
 * serverless HTTP driver. Only called from `src/db/client.ts`, and only when a
 * real database is expected, so demo mode never trips the throw below.
 */
export function getDatabaseConnection(): { url: string; useServerDriver: boolean } {
  const url = process.env.NETLIFY_DB_URL
  if (!url) {
    throw new Error(
      'NETLIFY_DB_URL is not set. Netlify provisions it when @netlify/database is installed; ' +
        'run `netlify database init` or redeploy. See README > Database.',
    )
  }
  return { url, useServerDriver: process.env.NETLIFY_DB_DRIVER === 'server' }
}
