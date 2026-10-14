import { loadArrSnapshots, loadOpportunities } from '@/data/datasets'
import type { DatasetBatch } from '@/db/schema'
import type { DbRole } from '@/db/rls'
import type { DatasetId } from '@/datasets/contract'
import { breakdownBy, computeArrMovements, computeKpis, pipelineByStage, type DateRange } from '@/lib/metrics'

/**
 * The payload builders behind the dashboard server functions
 * (`src/server/dashboard.ts`, which adds auth + read-audit). This is the
 * single place per-deal rows are turned into aggregates: every export returns
 * totals and groupings ONLY — never ids, account ids or row-level fields.
 * Kept free of `createServerFn` so it can be unit-tested directly.
 */
export type DatasetMeta = { source: string; updatedAt: string; rowCount: number } | null
export type DashboardMeta = Record<DatasetId, DatasetMeta>

export function toMeta(batch: DatasetBatch | null): DatasetMeta {
  return batch
    ? { source: batch.source, updatedAt: batch.createdAt.toISOString(), rowCount: batch.rowCount }
    : null
}

export async function overview(role: DbRole, range: DateRange) {
  const [opps, snaps] = await Promise.all([loadOpportunities(role), loadArrSnapshots(role)])
  return {
    kpis: computeKpis(opps, snaps, range),
    pipeline: pipelineByStage(opps, range, 'segment'),
    arrMovements: computeArrMovements(snaps, range),
  }
}

export async function pipeline(role: DbRole, range: DateRange, by: 'segment' | 'owner' | 'source') {
  return pipelineByStage(await loadOpportunities(role), range, by)
}

export async function arrMovements(role: DbRole, range: DateRange) {
  return computeArrMovements(await loadArrSnapshots(role), range)
}

export async function breakdown(role: DbRole, range: DateRange, by: 'segment' | 'owner' | 'stage') {
  return breakdownBy(await loadOpportunities(role), range, by)
}
