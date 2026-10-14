import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireDataAccess, auditRead } from '@/auth/server'
import { dashboardRoles } from '@/auth/data-access'
import { getActiveBatches } from '@/data/datasets'
import { toMeta, type DashboardMeta } from '@/server/dashboard-queries'
import * as q from '@/server/dashboard-queries'

export type { DashboardMeta, DatasetMeta } from '@/server/dashboard-queries'

/**
 * Dashboard server functions. They return AGGREGATES ONLY — no function here
 * (or anywhere) sends per-deal rows, owners-per-deal or account IDs to the
 * client. Every call is role-checked (`requireDataAccess`) and read-audited
 * (`auditRead`). Views read the database cache, never the warehouse.
 */
const rangeInput = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

async function begin(view: string, range: { from: string; to: string }, extra = '') {
  const { dbRole } = await requireDataAccess(dashboardRoles)
  await auditRead('dashboard.viewed', 'dashboard', `${view}?from=${range.from}&to=${range.to}${extra}`)
  const batches = await getActiveBatches(dbRole)
  const meta: DashboardMeta = {
    opportunities: toMeta(batches.opportunities),
    arr_snapshots: toMeta(batches.arr_snapshots),
  }
  return { dbRole, meta }
}

export const getOverview = createServerFn({ method: 'GET' })
  .validator(rangeInput)
  .handler(async ({ data }) => {
    const { dbRole, meta } = await begin('overview', data)
    return { meta, ...(await q.overview(dbRole, data)) }
  })

export const getPipelineByStage = createServerFn({ method: 'GET' })
  .validator(rangeInput.extend({ breakdown: z.enum(['segment', 'owner', 'source']) }))
  .handler(async ({ data }) => {
    const { dbRole, meta } = await begin('pipeline', data, `&breakdown=${data.breakdown}`)
    return { meta, ...(await q.pipeline(dbRole, data, data.breakdown)) }
  })

export const getArrMovements = createServerFn({ method: 'GET' })
  .validator(rangeInput)
  .handler(async ({ data }) => {
    const { dbRole, meta } = await begin('arr', data)
    return { meta, movements: await q.arrMovements(dbRole, data) }
  })

export const getBreakdown = createServerFn({ method: 'GET' })
  .validator(rangeInput.extend({ groupBy: z.enum(['segment', 'owner', 'stage']) }))
  .handler(async ({ data }) => {
    const { dbRole, meta } = await begin('breakdown', data, `&groupBy=${data.groupBy}`)
    return { meta, rows: await q.breakdown(dbRole, data, data.groupBy) }
  })

/** Metadata only (Last updated stamps) for pages that don't query metrics. */
export const getDashboardMeta = createServerFn({ method: 'GET' }).handler(async () => {
  const { dbRole } = await requireDataAccess(dashboardRoles)
  const batches = await getActiveBatches(dbRole)
  return {
    opportunities: toMeta(batches.opportunities),
    arr_snapshots: toMeta(batches.arr_snapshots),
  } satisfies DashboardMeta
})
