import { getSalesforceConfig } from '@/config/flags'
import { dashboardConfig } from '@/config/dashboard'
import { auditFromFunction } from '@/auth/function-audit'
import { ingestBatch } from '@/data/datasets'
import { createSalesforceAdapter } from '@/datasets/adapters/salesforce'
import type { DbRole } from '@/db/rls'

/**
 * Shared by the manual (`salesforce-refresh`) and nightly
 * (`salesforce-scheduled-refresh`) functions: pull opportunities, full-replace
 * the active batch, audit counts only. Callers check that Salesforce is
 * configured and authorize first.
 */
export async function refreshOpportunitiesFromSalesforce(opts: {
  role: DbRole
  actor?: { id?: string; email?: string }
  now?: Date
}) {
  const config = getSalesforceConfig()
  if (!config) throw new Error('Salesforce is not configured')
  const year = (opts.now ?? new Date()).getUTCFullYear()
  const since = `${year - dashboardConfig.salesforce.value.lookbackYears}-01-01`

  const rows = await createSalesforceAdapter(config).getDataset('opportunities', { since })
  const { batch, previous } = await ingestBatch('opportunities', rows, {
    source: 'salesforce',
    actor: opts.actor,
    role: opts.role,
  })
  const meta = (b: typeof batch | null) =>
    b ? { dataset: b.dataset, rowCount: b.rowCount, source: b.source } : null
  await auditFromFunction('dataset.refreshed', 'dataset_batch', batch.id, meta(previous), meta(batch))
  return { batch, previous }
}
