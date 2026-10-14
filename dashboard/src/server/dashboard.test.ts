import { describe, it, expect } from 'vitest'
import { arrMovements, breakdown, overview, pipeline } from '@/server/dashboard-queries'

const range = { from: '2025-01-01', to: '2026-12-31' }

/** Walks a value and returns every object key and string value. */
function collect(value: unknown, keys = new Set<string>(), strings = new Set<string>()) {
  if (typeof value === 'string') strings.add(value)
  else if (Array.isArray(value)) value.forEach((v) => collect(v, keys, strings))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k)
      collect(v, keys, strings)
    }
  }
  return { keys, strings }
}

describe('dashboard payload builders (demo mode)', () => {
  it('return aggregates only: no per-deal ids, account ids or row-level fields', async () => {
    const outputs = [
      await overview('viewer', range),
      await pipeline('viewer', range, 'owner'),
      await arrMovements('viewer', range),
      await breakdown('viewer', range, 'owner'),
    ]
    for (const out of outputs) {
      const { keys, strings } = collect(out)
      expect(keys.size).toBeGreaterThan(0)
      for (const forbidden of ['id', 'account_id', 'created_date', 'close_date', 'amount', 'arr', 'status']) {
        expect(keys.has(forbidden)).toBe(false)
      }
      expect([...strings].some((s) => /^(opp_|acct_)/.test(s))).toBe(false)
    }
  })

  it('actually aggregates (far fewer output rows than the ~600 deals behind them)', async () => {
    expect((await breakdown('viewer', range, 'owner')).length).toBeLessThanOrEqual(8)
    expect((await overview('viewer', range)).pipeline.rows).toHaveLength(5)
  })
})
