import type { Config } from '@netlify/functions'
import { isAuthEnabled, isSalesforceEnabled } from '../../src/config/flags'
import { appConfig } from '../../src/config/app'
import { checkRole, getSessionUser } from '../../src/auth/session'
import { resolveDbRole } from '../../src/db/rls'
import { refreshOpportunitiesFromSalesforce } from '../../src/datasets/salesforce-refresh'
import { DatasetValidationError } from '../../src/datasets/contract'

/**
 * POST /api/datasets/refresh/salesforce  (no body)
 *
 * Manual opportunities refresh from Salesforce. The SOQL is fixed server-side
 * (src/config/saved-queries.ts); the client can't influence it. Credentials
 * never leave this function. Fail-closed like the Snowflake refresh: no
 * Identity -> 403. The nightly run is salesforce-scheduled-refresh.mts.
 */
export default async (_req: Request) => {
  if (!isAuthEnabled()) return Response.json({ error: 'not_configured' }, { status: 403 })
  const denied = await checkRole(appConfig.dataEditorRoles)
  if (denied) return denied

  if (!isSalesforceEnabled()) return Response.json({ error: 'salesforce_not_configured' }, { status: 409 })

  const user = (await getSessionUser())!
  const role = resolveDbRole(user.roles)!
  try {
    const { batch } = await refreshOpportunitiesFromSalesforce({
      role,
      actor: { id: user.id, email: user.email },
    })
    return Response.json({ ok: true, batchId: batch.id, rowCount: batch.rowCount })
  } catch (err) {
    if (err instanceof DatasetValidationError) {
      return Response.json(
        { ok: false, row: err.row, column: err.column, message: err.message },
        { status: 422 },
      )
    }
    console.error('Salesforce refresh failed:', err instanceof Error ? err.message : err)
    return Response.json(
      { ok: false, message: 'Salesforce refresh failed. Check the function logs.' },
      { status: 502 },
    )
  }
}

export const config: Config = {
  path: '/api/datasets/refresh/salesforce',
  method: 'POST',
}
