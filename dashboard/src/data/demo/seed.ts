import type { ArrSnapshotRow, OpportunityRow } from '@/datasets/contract'
import { dashboardConfig } from '@/config/dashboard'
import { endOfMonth } from '@/lib/metrics'

/**
 * Single source of truth for demo/seed data — fully synthetic, for the
 * fictional company "Larkspur Robotics". Nothing here is real: owners are
 * made-up names and account IDs are opaque random strings.
 *
 * - Demo mode loads these generators into memory (`src/data/datasets.ts`).
 * - Against a real database, `scripts/seed.ts` loads them as a `seed` batch.
 *
 * The PRNG is seeded, so the shape is identical on every run; dates are
 * anchored to the month the server starts so the demo never looks stale.
 */
export const demoCompany = 'Larkspur Robotics'

export const demoOwners = [
  'Avery Lindqvist',
  'Bao Tran',
  'Camila Duarte',
  'Dev Raman',
  'Ellis Okafor',
  'Fenna Haugen',
  'Gil Moreau',
  'Hana Kobayashi',
]
const sources = ['Inbound', 'Outbound', 'Partner', 'Event']
const segmentWeights: Array<[string, number]> = [
  ['SMB', 0.5],
  ['Mid-Market', 0.35],
  ['Enterprise', 0.15],
]
const amountRange: Record<string, [number, number]> = {
  SMB: [4_000, 22_000],
  'Mid-Market': [20_000, 85_000],
  Enterprise: [90_000, 320_000],
}
const initialArr: Record<string, [number, number]> = {
  SMB: [5_000, 24_000],
  'Mid-Market': [24_000, 90_000],
  Enterprise: [90_000, 300_000],
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => d.toISOString().slice(0, 10)
const between = (rand: () => number, lo: number, hi: number) => lo + rand() * (hi - lo)
const pick = <T>(rand: () => number, items: ReadonlyArray<T>) => items[Math.floor(rand() * items.length)]
function pickWeighted(rand: () => number, items: Array<[string, number]>) {
  let r = rand()
  for (const [v, w] of items) {
    if ((r -= w) < 0) return v
  }
  return items[items.length - 1][0]
}
const monthOf = (today: string, offset: number): string => {
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7)) - 1 + offset
  return `${y + Math.floor(m / 12)}-${pad((((m % 12) + 12) % 12) + 1)}-01`
}
const addDays = (date: string, days: number) =>
  iso(new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000))

export function seedOpportunities(today: string = iso(new Date())): Array<OpportunityRow> {
  const rand = mulberry32(20260902)
  const fy = dashboardConfig.fiscalYearStartMonth.value
  const stages = dashboardConfig.stages.value
  const rows: Array<OpportunityRow> = []
  // Closes span 8 past + 2 future quarters = 30 months, i.e. 10 quarters.
  for (let offset = -27; offset <= 2; offset++) {
    const month = monthOf(today, offset)
    const monthNum = Number(month.slice(5, 7))
    // Quarter-end months close more and bigger (seasonality), with mild growth over time.
    const quarterPos = ((((monthNum - fy) % 12) + 12) % 12) % 3
    const season = quarterPos === 2 ? 1.5 : quarterPos === 1 ? 1 : 0.7
    const count = Math.round((16 + (offset + 27) * 0.25) * season)
    for (let i = 0; i < count; i++) {
      const segment = pickWeighted(rand, segmentWeights)
      const [lo, hi] = amountRange[segment]
      const amount = Math.round((between(rand, lo, hi) * (0.9 + 0.2 * season)) / 50) * 50
      const close = addDays(month, Math.floor(rand() * Number(endOfMonth(month).slice(8, 10))))
      const cycle = Math.round(
        between(rand, 25, segment === 'Enterprise' ? 160 : segment === 'Mid-Market' ? 95 : 55),
      )
      const isPast = close < today
      let status: OpportunityRow['status'] = 'open'
      let stage = pick(rand, stages).name
      if (isPast) {
        // Later stages convert better; ~28% overall win rate, with stage-dependent losses.
        stage = pickWeighted(rand, [
          ['Prospecting', 0.2],
          ['Discovery', 0.25],
          ['Proposal', 0.25],
          ['Negotiation', 0.2],
          ['Commit', 0.1],
        ])
        const winChance = {
          Prospecting: 0.03,
          Discovery: 0.1,
          Proposal: 0.3,
          Negotiation: 0.6,
          Commit: 0.85,
        }[stage]!
        if (rand() < winChance * (segment === 'Enterprise' ? 0.85 : 1.1)) {
          status = 'won'
          stage = 'Commit'
        } else status = 'lost'
      }
      rows.push({
        id: `opp_${String(rows.length + 1).padStart(4, '0')}`,
        owner: pick(rand, demoOwners),
        stage,
        amount,
        created_date: addDays(close, -cycle),
        close_date: close,
        segment,
        source: pickWeighted(
          rand,
          sources.map((s, i) => [s, [0.35, 0.25, 0.25, 0.15][i]]),
        ),
        status,
      })
    }
  }
  return rows
}

export function seedArrSnapshots(today: string = iso(new Date())): Array<ArrSnapshotRow> {
  const rand = mulberry32(20260916)
  const months = Array.from({ length: 30 }, (_, i) => monthOf(today, i - 29))
  const rows: Array<ArrSnapshotRow> = []
  const used = new Set<string>()
  for (let a = 0; a < 300; a++) {
    let id: string
    do {
      id = `acct_${Math.floor(rand() * 36 ** 5)
        .toString(36)
        .padStart(5, '0')}${Math.floor(rand() * 36).toString(36)}`
    } while (used.has(id))
    used.add(id)
    const segment = pickWeighted(rand, segmentWeights)
    const [lo, hi] = initialArr[segment]
    let arr = Math.round(between(rand, lo, hi) / 10) * 10
    // Most accounts start early, the rest trickle in over time.
    const start = rand() < 0.45 ? 0 : Math.floor(rand() * 28)
    let churnedFor = -1
    for (let i = 0; i < months.length; i++) {
      if (i < start) continue
      if (churnedFor >= 0) {
        churnedFor++
        if (churnedFor >= 2 && rand() < 0.08) {
          churnedFor = -1 // reactivation: counts as new ARR
          arr = Math.round(between(rand, lo, hi) / 10) * 10
        } else continue
      } else if (i > start) {
        const r = rand()
        if (r < 0.012 + (segment === 'SMB' ? 0.01 : 0)) {
          churnedFor = 0
          continue
        } else if (r < 0.07) arr = Math.round((arr * between(rand, 1.05, 1.3)) / 10) * 10
        else if (r < 0.1) arr = Math.round((arr * between(rand, 0.75, 0.95)) / 10) * 10
      }
      rows.push({ account_id: id, month: months[i], arr })
    }
  }
  return rows
}
