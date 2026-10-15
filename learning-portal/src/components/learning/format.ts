/** "45 min", "1 hr", "2 hr 15 min". */
export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`
}

export function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}
