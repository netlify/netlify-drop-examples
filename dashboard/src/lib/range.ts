import { presetRange, type DateRange } from '@/lib/metrics'

const ISO = /^\d{4}-\d{2}-\d{2}$/

export type RangeSearch = { from?: string; to?: string }

export function validateRangeSearch(search: Record<string, unknown>): RangeSearch {
  const from = typeof search.from === 'string' && ISO.test(search.from) ? search.from : undefined
  const to = typeof search.to === 'string' && ISO.test(search.to) ? search.to : undefined
  return from && to && from <= to ? { from, to } : {}
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The default window (when no range is in the URL) is the last four fiscal quarters. */
export function resolveRange(search: RangeSearch): DateRange {
  return search.from && search.to
    ? { from: search.from, to: search.to }
    : presetRange('last-4-quarters', todayIso())
}
