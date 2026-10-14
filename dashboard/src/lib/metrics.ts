import { dashboardConfig } from '@/config/dashboard'
import type { ArrSnapshotRow, OpportunityRow } from '@/datasets/contract'

/** Pure metric functions. Dates are `YYYY-MM-DD` strings; ranges are inclusive. */
export type DateRange = { from: string; to: string }

const DAY_MS = 86_400_000

export function inRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to
}

export function stageProbability(stage: string): number {
  return dashboardConfig.stages.value.find((s) => s.name === stage)?.probability ?? 0
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)
}

export type Kpis = {
  totalPipeline: number
  weightedPipeline: number
  closedWonArr: number
  winRate: number | null
  avgSalesCycleDays: number | null
  netNewArr: number
}

export function computeKpis(
  opps: Array<OpportunityRow>,
  snaps: Array<ArrSnapshotRow>,
  range: DateRange,
): Kpis {
  let totalPipeline = 0
  let weightedPipeline = 0
  let closedWonArr = 0
  let won = 0
  let lost = 0
  let cycleDays = 0
  for (const o of opps) {
    if (!inRange(o.close_date, range)) continue
    if (o.status === 'open') {
      totalPipeline += o.amount
      weightedPipeline += o.amount * stageProbability(o.stage)
    } else if (o.status === 'won') {
      won++
      closedWonArr += o.amount
      cycleDays += daysBetween(o.created_date, o.close_date)
    } else lost++
  }
  const movements = computeArrMovements(snaps, range)
  return {
    totalPipeline,
    weightedPipeline,
    closedWonArr,
    winRate: won + lost > 0 ? won / (won + lost) : null,
    avgSalesCycleDays: won > 0 ? cycleDays / won : null,
    netNewArr: movements.reduce((sum, m) => sum + m.net, 0),
  }
}

export function pipelineByStage(
  opps: Array<OpportunityRow>,
  range: DateRange,
  breakdown: 'segment' | 'owner' | 'source',
) {
  const keys = new Set<string>()
  const byStage = new Map<string, Record<string, number>>()
  for (const s of dashboardConfig.stages.value) byStage.set(s.name, {})
  for (const o of opps) {
    if (o.status !== 'open' || !inRange(o.close_date, range)) continue
    const row = byStage.get(o.stage)
    if (!row) continue
    keys.add(o[breakdown])
    row[o[breakdown]] = (row[o[breakdown]] ?? 0) + o.amount
  }
  const series = [...keys].sort()
  return {
    series,
    rows: [...byStage.entries()].map(([stage, values]) => ({
      stage,
      total: Object.values(values).reduce((a, b) => a + b, 0),
      ...Object.fromEntries(series.map((k) => [k, values[k] ?? 0])),
    })) as Array<{ stage: string; total: number } & Record<string, number | string>>,
  }
}

export type ArrMovement = {
  month: string
  newArr: number
  expansion: number
  contraction: number // negative
  churn: number // negative
  net: number
}

export function nextMonth(month: string): string {
  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`
}

/**
 * Month-over-month ARR movements per account, classified per
 * `dashboardConfig.churnDefinition` (nothing is precomputed):
 * - prev 0/absent → cur > 0: new (this also covers reactivation after churn)
 * - prev > 0, cur absent or 0: churn
 * - both > 0: expansion if cur > prev, contraction if cur < prev
 * A month absent from the data for an account is treated as zero ARR. Months
 * are the union of snapshot months; each movement is attributed to the month
 * of the later snapshot and kept when that month is within `range`.
 */
export function computeArrMovements(snaps: Array<ArrSnapshotRow>, range: DateRange): Array<ArrMovement> {
  if (snaps.length === 0) return []
  const byAccount = new Map<string, Map<string, number>>()
  let minMonth = snaps[0].month
  let maxMonth = snaps[0].month
  for (const s of snaps) {
    let m = byAccount.get(s.account_id)
    if (!m) byAccount.set(s.account_id, (m = new Map()))
    m.set(s.month, (m.get(s.month) ?? 0) + s.arr)
    if (s.month < minMonth) minMonth = s.month
    if (s.month > maxMonth) maxMonth = s.month
  }
  const months: Array<string> = []
  for (let m = minMonth; m <= maxMonth; m = nextMonth(m)) months.push(m)

  const result = new Map<string, ArrMovement>()
  for (const m of months.slice(1)) {
    if (!inRange(m, range)) continue
    result.set(m, { month: m, newArr: 0, expansion: 0, contraction: 0, churn: 0, net: 0 })
  }
  for (const history of byAccount.values()) {
    for (let i = 1; i < months.length; i++) {
      const mv = result.get(months[i])
      if (!mv) continue
      const prev = history.get(months[i - 1]) ?? 0
      const cur = history.get(months[i]) ?? 0
      if (prev === 0 && cur > 0) mv.newArr += cur
      else if (prev > 0 && cur === 0) mv.churn -= prev
      else if (cur > prev) mv.expansion += cur - prev
      else if (cur < prev) mv.contraction -= prev - cur
    }
  }
  return [...result.values()].map((m) => ({ ...m, net: m.newArr + m.expansion + m.contraction + m.churn }))
}

export type BreakdownRow = {
  group: string
  openPipeline: number
  weightedPipeline: number
  wonArr: number
  wonCount: number
  lostCount: number
  winRate: number | null
}

export function breakdownBy(
  opps: Array<OpportunityRow>,
  range: DateRange,
  groupBy: 'segment' | 'owner' | 'stage',
): Array<BreakdownRow> {
  const groups = new Map<string, BreakdownRow>()
  for (const o of opps) {
    if (!inRange(o.close_date, range)) continue
    const key = o[groupBy]
    let g = groups.get(key)
    if (!g) {
      groups.set(
        key,
        (g = {
          group: key,
          openPipeline: 0,
          weightedPipeline: 0,
          wonArr: 0,
          wonCount: 0,
          lostCount: 0,
          winRate: null,
        }),
      )
    }
    if (o.status === 'open') {
      g.openPipeline += o.amount
      g.weightedPipeline += o.amount * stageProbability(o.stage)
    } else if (o.status === 'won') {
      g.wonArr += o.amount
      g.wonCount++
    } else g.lostCount++
  }
  return [...groups.values()].map((g) => ({
    ...g,
    winRate: g.wonCount + g.lostCount > 0 ? g.wonCount / (g.wonCount + g.lostCount) : null,
  }))
}

// --- Fiscal calendar & presets -------------------------------------------

export type RangePreset = 'this-quarter' | 'last-quarter' | 'fiscal-ytd' | 'last-4-quarters'
export const presetLabels: Record<RangePreset, string> = {
  'this-quarter': 'This fiscal quarter',
  'last-quarter': 'Last fiscal quarter',
  'fiscal-ytd': 'Fiscal year to date',
  'last-4-quarters': 'Last 4 fiscal quarters',
}

function addMonths(month: string, n: number): string {
  let m = month
  for (let i = 0; i < Math.abs(n); i++) {
    if (n > 0) m = nextMonth(m)
    else {
      const y = Number(m.slice(0, 4))
      const mo = Number(m.slice(5, 7))
      m = mo === 1 ? `${y - 1}-12-01` : `${y}-${String(mo - 1).padStart(2, '0')}-01`
    }
  }
  return m
}

export function endOfMonth(month: string): string {
  const next = Date.parse(`${nextMonth(month)}T00:00:00Z`) - DAY_MS
  return new Date(next).toISOString().slice(0, 10)
}

export function fiscalQuarterStart(date: string, fyStartMonth: number): string {
  const monthNum = Number(date.slice(5, 7))
  const offset = (((monthNum - fyStartMonth) % 12) + 12) % 12
  return addMonths(monthStart(date), -(offset % 3))
}

export function fiscalYearStart(date: string, fyStartMonth: number): string {
  const monthNum = Number(date.slice(5, 7))
  const offset = (((monthNum - fyStartMonth) % 12) + 12) % 12
  return addMonths(monthStart(date), -offset)
}

export function presetRange(
  preset: RangePreset,
  today: string,
  fyStartMonth: number = dashboardConfig.fiscalYearStartMonth.value,
): DateRange {
  const q = fiscalQuarterStart(today, fyStartMonth)
  switch (preset) {
    case 'this-quarter':
      return { from: q, to: endOfMonth(addMonths(q, 2)) }
    case 'last-quarter': {
      const start = addMonths(q, -3)
      return { from: start, to: endOfMonth(addMonths(start, 2)) }
    }
    case 'fiscal-ytd':
      return { from: fiscalYearStart(today, fyStartMonth), to: today }
    case 'last-4-quarters': {
      const start = addMonths(q, -9)
      return { from: start, to: endOfMonth(addMonths(q, 2)) }
    }
  }
}
