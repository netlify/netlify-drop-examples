import { describe, it, expect } from 'vitest'
import { computeKpis, computeArrMovements, pipelineByStage, breakdownBy, presetRange } from '@/lib/metrics'
import type { ArrSnapshotRow, OpportunityRow } from '@/datasets/contract'

const range = { from: '2026-01-01', to: '2026-12-31' }
function opp(p: Partial<OpportunityRow>): OpportunityRow {
  return {
    id: 'o',
    owner: 'Rep A',
    stage: 'Proposal',
    amount: 100,
    created_date: '2026-01-01',
    close_date: '2026-03-01',
    segment: 'SMB',
    source: 'Inbound',
    status: 'open',
    ...p,
  }
}
const snap = (account_id: string, month: string, arr: number): ArrSnapshotRow => ({ account_id, month, arr })

describe('computeKpis', () => {
  const opps = [
    opp({ amount: 1000, stage: 'Proposal' }), // open, p=.4
    opp({ amount: 500, stage: 'Commit' }), // open, p=.9
    opp({ amount: 200, stage: 'Proposal', close_date: '2027-01-01' }), // out of range
    opp({ status: 'won', amount: 300, created_date: '2026-01-01', close_date: '2026-01-31' }), // 30d
    opp({ status: 'won', amount: 100, created_date: '2026-02-01', close_date: '2026-03-03' }), // 30d
    opp({ status: 'lost', amount: 999 }),
  ]
  it('computes pipeline, win rate and cycle over the range', () => {
    const k = computeKpis(opps, [], range)
    expect(k.totalPipeline).toBe(1500)
    expect(k.weightedPipeline).toBeCloseTo(1000 * 0.4 + 500 * 0.9)
    expect(k.closedWonArr).toBe(400)
    expect(k.winRate).toBeCloseTo(2 / 3)
    expect(k.avgSalesCycleDays).toBe(30)
  })
  it('returns null rates when there is nothing to divide by', () => {
    const k = computeKpis([], [], range)
    expect(k.winRate).toBeNull()
    expect(k.avgSalesCycleDays).toBeNull()
  })
})

describe('computeArrMovements', () => {
  it('classifies new, expansion, contraction and churn', () => {
    const snaps = [
      snap('a', '2026-01-01', 100),
      snap('a', '2026-02-01', 150), // expansion 50
      snap('b', '2026-01-01', 100),
      snap('b', '2026-02-01', 60), // contraction -40
      snap('c', '2026-01-01', 80),
      snap('c', '2026-02-01', 0), // churn -80 (zero)
      snap('d', '2026-02-01', 70), // new 70
    ]
    const [feb] = computeArrMovements(snaps, range)
    expect(feb).toMatchObject({
      month: '2026-02-01',
      newArr: 70,
      expansion: 50,
      contraction: -40,
      churn: -80,
      net: 0,
    })
  })
  it('treats a missing month as churn and a return as new (reactivation)', () => {
    const snaps = [
      snap('a', '2026-01-01', 100),
      snap('a', '2026-03-01', 120), // absent in Feb -> churn in Feb, new in Mar
      snap('z', '2026-01-01', 1),
      snap('z', '2026-02-01', 1),
      snap('z', '2026-03-01', 1),
    ]
    const [feb, mar] = computeArrMovements(snaps, range)
    expect(feb.churn).toBe(-100)
    expect(mar.newArr).toBe(120)
    expect(mar.expansion).toBe(0)
  })
  it('only reports months within the range', () => {
    const snaps = [snap('a', '2026-01-01', 1), snap('a', '2026-02-01', 2), snap('a', '2026-03-01', 3)]
    const out = computeArrMovements(snaps, { from: '2026-03-01', to: '2026-03-31' })
    expect(out.map((m) => m.month)).toEqual(['2026-03-01'])
  })
  it('feeds net new ARR in the KPIs', () => {
    const snaps = [snap('a', '2026-01-01', 100), snap('a', '2026-02-01', 150)]
    expect(computeKpis([], snaps, range).netNewArr).toBe(50)
  })
})

describe('aggregations', () => {
  it('groups open pipeline by stage and breakdown key', () => {
    const { series, rows } = pipelineByStage(
      [opp({ segment: 'SMB', amount: 10 }), opp({ segment: 'Enterprise', amount: 20 })],
      range,
      'segment',
    )
    expect(series).toEqual(['Enterprise', 'SMB'])
    expect(rows.find((r) => r.stage === 'Proposal')).toMatchObject({ Enterprise: 20, SMB: 10, total: 30 })
    expect(rows.find((r) => r.stage === 'Discovery')?.total).toBe(0)
  })
  it('breaks down by owner with win rate', () => {
    const rows = breakdownBy(
      [opp({ status: 'won', amount: 5 }), opp({ status: 'lost' }), opp({ owner: 'Rep B', amount: 7 })],
      range,
      'owner',
    )
    expect(rows.find((r) => r.group === 'Rep A')).toMatchObject({ wonArr: 5, winRate: 0.5 })
    expect(rows.find((r) => r.group === 'Rep B')).toMatchObject({ openPipeline: 7, winRate: null })
  })
})

describe('presetRange (FY starts in February)', () => {
  it('computes fiscal quarters and YTD', () => {
    // 2026-10-06 is in Q3 of FY2026 (Aug–Oct)
    expect(presetRange('this-quarter', '2026-10-06', 2)).toEqual({ from: '2026-08-01', to: '2026-10-31' })
    expect(presetRange('last-quarter', '2026-10-06', 2)).toEqual({ from: '2026-05-01', to: '2026-07-31' })
    expect(presetRange('fiscal-ytd', '2026-10-06', 2)).toEqual({ from: '2026-02-01', to: '2026-10-06' })
    expect(presetRange('last-4-quarters', '2026-10-06', 2)).toEqual({ from: '2025-11-01', to: '2026-10-31' })
  })
  it('handles January belonging to the previous fiscal year', () => {
    expect(presetRange('fiscal-ytd', '2026-01-15', 2).from).toBe('2025-02-01')
  })
})
