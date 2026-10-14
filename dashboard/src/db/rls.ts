import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { appConfig } from '@/config/app'

export type DbRole = 'viewer' | 'editor' | 'admin' | 'system'

type Db = ReturnType<typeof getDb>
export type RlsTx = Parameters<Parameters<Db['transaction']>[0]>[0]

/**
 * Maps a session's roles to the database role used by the RLS policies
 * (see the `dataset_rls` migration). Highest privilege wins. Returns `null`
 * when the user has none of the dashboard roles — callers must deny.
 */
export function resolveDbRole(roles: ReadonlyArray<string> | undefined): DbRole | null {
  const r = roles ?? []
  if (r.includes(appConfig.roles.admin)) return 'admin'
  if (r.includes(appConfig.roles.editor)) return 'editor'
  if (r.includes(appConfig.roles.viewer)) return 'viewer'
  return null
}

/**
 * Runs `fn` inside a transaction with `app.role` set (transaction-local), so
 * RLS policies see the caller's role. All dataset data access goes through
 * this — with no role set, every policy fails and the query sees nothing.
 * Seed and purge use `system`.
 */
export async function withDbRole<T>(role: DbRole, fn: (tx: RlsTx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.role', ${role}, true)`)
    return fn(tx)
  })
}

/**
 * Startup/diagnostic check: RLS is bypassed by superusers and BYPASSRLS
 * roles even with FORCE. Reports (never hides) a failing connection role.
 */
export async function checkRlsEnforced(): Promise<{ rolbypassrls: boolean; rolsuper: boolean }> {
  const res = await getDb().execute(
    sql`select rolbypassrls, rolsuper from pg_roles where rolname = current_user`,
  )
  const row = (res as unknown as { rows?: Array<Record<string, boolean>> }).rows?.[0] ?? {}
  return { rolbypassrls: !!row.rolbypassrls, rolsuper: !!row.rolsuper }
}
