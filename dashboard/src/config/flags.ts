import { getIdentityConfig } from '@netlify/identity'

const officialDemoSiteIds = new Set<string>([
  '480ddca5-1fd1-4784-b8c7-c889474b8cf9',
  // Public Pipeline & ARR demo (https://dashboard-app-pack.netlify.app).
  '0572e062-b021-497b-babf-b653423e3c9a',
])

const officialDemoSiteNames = new Set(['app-pack-template'])

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
 * on a laptop — including `netlify dev` when the repo is linked to a site,
 * which sets `SITE_ID` too.
 */
export function isDeployed(): boolean {
  if (process.env.NETLIFY_DEV === 'true') return false
  return !!(process.env.SITE_ID ?? process.env.NETLIFY_SITE_ID ?? process.env.SITE_NAME)
}

/** True only on a canonical public demo project (see `officialDemoSiteIds`/`officialDemoSiteNames`). */
export function isOfficialDemoSite(): boolean {
  if (!isDeployed()) return false
  const siteId = process.env.SITE_ID ?? process.env.NETLIFY_SITE_ID
  const siteName = process.env.SITE_NAME
  return (
    (siteId ? officialDemoSiteIds.has(siteId) : false) ||
    (siteName ? officialDemoSiteNames.has(siteName) : false)
  )
}

export function isDemoMode(): boolean {
  // Demo mode is automatic:
  //
  // - Local development stays in demo mode so the template runs with zero
  //   setup.
  // - The canonical Netlify demo project stays in demo mode so prospective
  //   users can explore the app without Identity or a database.
  // - Every other deployed Netlify project uses the real database path.
  //
  // This deliberately does NOT infer demo mode from whether NETLIFY_DB_URL is
  // set. @netlify/database can auto-provision a local Postgres database (and
  // set NETLIFY_DB_URL) in dev merely because the package is a dependency,
  // before you've ever applied a single migration.
  return !isDeployed() || isOfficialDemoSite()
}

export function isAuthEnabled(): boolean {
  if (process.env.NETLIFY_DEV === 'true' && process.env.AUTH_DEV_USER) {
    return true
  }

  if (isDemoMode()) {
    return false
  }

  return getIdentityConfig() != null
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
 * Whether the scheduled hard-purge job (`netlify/functions/purge-deleted-records.mts`)
 * is allowed to permanently delete soft-deleted dataset batches. Off by default and
 * genuinely inert when off — nothing reads `RECORD_RETENTION_DAYS` at all
 * unless this is `true`. Soft delete itself (see `src/db/soft-delete.ts`) is
 * always on and unrelated to this flag; this only gates permanent purging.
 */
export function isPurgeEnabled(): boolean {
  return process.env.PURGE_ENABLED === 'true'
}

/**
 * How many days a soft-deleted record is retained before the purge job
 * permanently deletes it. Only ever called after confirming
 * `isPurgeEnabled()` — a retention period is a compliance decision, not a
 * safe engineering default, so this throws rather than guessing a number
 * when purge is turned on but no retention window has been configured.
 */
export function getRetentionDays(): number {
  const value = process.env.RECORD_RETENTION_DAYS
  const days = Number(value)
  if (!value || !Number.isFinite(days) || days <= 0) {
    throw new Error(
      'RECORD_RETENTION_DAYS is not set (or invalid). PURGE_ENABLED=true requires an explicit, ' +
        'positive number of days — there is no safe default for a data-retention policy. See README > Soft delete.',
    )
  }
  return days
}

/**
 * AES-256-GCM key for field-level and raw-file encryption (`src/lib/crypto.ts`).
 * 32 bytes, base64. Required outside demo mode — there is deliberately no
 * default: the app fails closed rather than storing confidential data
 * unencrypted. Set it as a SECRET site env var (never `VITE_*`). See
 * README > Data classification (Tier 2).
 */
export function getDataEncryptionKey(): Buffer {
  const value = process.env.DATA_ENCRYPTION_KEY?.trim()
  if (!value) {
    throw new Error(
      'DATA_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32` and set it as a secret ' +
        'site environment variable. See README > Data classification (Tier 2).',
    )
  }
  const key = Buffer.from(value, 'base64')
  if (key.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded (`openssl rand -base64 32`).')
  }
  return key
}

/**
 * Whether `DATA_ENCRYPTION_KEY` is set to a valid key. For the Finish setting
 * up checklist only — never exposes the key itself.
 */
export function isDataEncryptionKeySet(): boolean {
  try {
    getDataEncryptionKey()
    return true
  } catch {
    return false
  }
}

export type SnowflakeConfig = {
  account: string
  user: string
  privateKey: string
  warehouse: string
  role: string
  database: string
  schema: string
}

/**
 * Snowflake connection settings, or `null` unless EVERY variable is set —
 * a partial configuration is treated as "not configured" so the refresh UI
 * and endpoint stay off. `SNOWFLAKE_PRIVATE_KEY` is a PEM (PKCS#8) private
 * key and must be a secret env var; literal `\n` sequences are accepted so
 * it can be pasted on one line.
 */
export function getSnowflakeConfig(): SnowflakeConfig | null {
  const env = process.env
  const account = env.SNOWFLAKE_ACCOUNT?.trim()
  const user = env.SNOWFLAKE_USER?.trim()
  const privateKey = env.SNOWFLAKE_PRIVATE_KEY?.trim()
  const warehouse = env.SNOWFLAKE_WAREHOUSE?.trim()
  const role = env.SNOWFLAKE_ROLE?.trim()
  const database = env.SNOWFLAKE_DATABASE?.trim()
  const schema = env.SNOWFLAKE_SCHEMA?.trim()
  if (!account || !user || !privateKey || !warehouse || !role || !database || !schema) return null
  return { account, user, privateKey: privateKey.replace(/\\n/g, '\n'), warehouse, role, database, schema }
}

export function isSnowflakeEnabled(): boolean {
  return getSnowflakeConfig() !== null
}

export type SalesforceConfig = {
  instanceUrl: string
  clientId: string
  clientSecret: string
}

/**
 * Salesforce connection settings (OAuth 2.0 client credentials flow), or
 * `null` unless EVERY variable is set — same all-or-nothing rule as
 * Snowflake. `SALESFORCE_INSTANCE_URL` is the org's My Domain URL (e.g.
 * `https://acme.my.salesforce.com`); `SALESFORCE_CLIENT_SECRET` must be a
 * secret env var.
 */
export function getSalesforceConfig(): SalesforceConfig | null {
  const env = process.env
  const instanceUrl = env.SALESFORCE_INSTANCE_URL?.trim().replace(/\/+$/, '')
  const clientId = env.SALESFORCE_CLIENT_ID?.trim()
  const clientSecret = env.SALESFORCE_CLIENT_SECRET?.trim()
  if (!instanceUrl || !clientId || !clientSecret) return null
  return { instanceUrl, clientId, clientSecret }
}

export function isSalesforceEnabled(): boolean {
  return getSalesforceConfig() !== null
}

/**
 * Link to this site's Identity users page in the Netlify dashboard (used for
 * the admin "Manage users" nav item), or `null` outside a deployed site.
 * Built from the read-only `SITE_NAME` metadata; the path is the dashboard's
 * conventional route and is not verified against future dashboard changes.
 */
export function getIdentityUsersUrl(): string | null {
  const name = process.env.SITE_NAME
  return name ? `https://app.netlify.com/projects/${encodeURIComponent(name)}/identity` : null
}
