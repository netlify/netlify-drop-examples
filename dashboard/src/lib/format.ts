// Formatted by hand (not Intl `notation: 'compact'`) so server and browser
// always render the same string — ICU versions differ and break hydration.
export function money(n: number, compact = true): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (compact && abs >= 1000) {
    const [div, suffix] = abs >= 1e9 ? [1e9, 'B'] : abs >= 1e6 ? [1e6, 'M'] : [1e3, 'K']
    return `${sign}$${(abs / div).toFixed(1).replace(/\.0$/, '')}${suffix}`
  }
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`
}
export const pct = (n: number | null) => (n === null ? '—' : `${(n * 100).toFixed(1)}%`)
export const days = (n: number | null) => (n === null ? '—' : `${Math.round(n)} days`)
export function monthLabel(month: string): string {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
}
export const vizColor = (index: number) => `var(--viz-${(index % 8) + 1})`
