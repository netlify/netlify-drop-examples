import type { Config } from '@netlify/functions'
import { isSalesforceEnabled } from '../../src/config/flags'
import { refreshOpportunitiesFromSalesforce } from '../../src/datasets/salesforce-refresh'

/**
 * Nightly opportunities refresh from Salesforce. No-ops unless all
 * SALESFORCE_* variables are set. Runs as the `system` DB role (RLS allows
 * it to insert/update) with no user; the audit entry has a null actor.
 * Scheduled functions can't be invoked by URL in production.
 *
 * Imports nothing from `src/auth/server.ts` — same bundle-size reason as
 * purge-deleted-records.mts.
 */
export default async (_req: Request) => {
  if (!isSalesforceEnabled()) {
    return Response.json({ ok: true, skipped: 'Salesforce is not configured' })
  }
  try {
    const { batch } = await refreshOpportunitiesFromSalesforce({ role: 'system' })
    return Response.json({ ok: true, batchId: batch.id, rowCount: batch.rowCount })
  } catch (err) {
    // Nothing was stored; the previous batch stays active.
    console.error('Scheduled Salesforce refresh failed:', err instanceof Error ? err.message : err)
    return Response.json({ ok: false }, { status: 500 })
  }
}

export const config: Config = {
  schedule: '0 4 * * *', // daily at 04:00 UTC, after the 03:00 purge
}
