import type { DatasetAdapter } from '@/datasets/adapter'
import {
  DatasetValidationError,
  datasetColumns,
  validateRecords,
  type DatasetId,
  type RowsFor,
} from '@/datasets/contract'

/**
 * Minimal RFC 4180 parser (quoted fields, escaped quotes, CRLF, newlines in
 * quotes). Hand-written so errors can name the exact row and column.
 * Returns each record with the 1-based file line it started on.
 */
export function parseCsv(text: string): Array<{ line: number; cells: Array<string> }> {
  const rows: Array<{ line: number; cells: Array<string> }> = []
  let cells: Array<string> = []
  let cell = ''
  let inQuotes = false
  let line = 1
  let startLine = 1
  let sawContent = false
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const endRow = () => {
    cells.push(cell)
    if (sawContent || cells.length > 1) rows.push({ line: startLine, cells })
    cells = []
    cell = ''
    sawContent = false
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else inQuotes = false
      } else {
        if (ch === '\n') line++
        cell += ch
      }
      continue
    }
    if (ch === '"' && cell === '') {
      inQuotes = true
      sawContent = true
    } else if (ch === ',') {
      cells.push(cell)
      cell = ''
      sawContent = true
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      endRow()
      line++
      startLine = line
    } else {
      cell += ch
      sawContent = true
    }
  }
  if (inQuotes) throw new DatasetValidationError(startLine, null, 'unterminated quoted field')
  if (cell !== '' || cells.length > 0 || sawContent) endRow()
  return rows
}

export type CsvParams = { text: string }

export const csvAdapter: DatasetAdapter<CsvParams> = {
  async getDataset<Q extends DatasetId>(queryId: Q, { text }: CsvParams): Promise<RowsFor<Q>> {
    const rows = parseCsv(text)
    if (rows.length === 0) throw new DatasetValidationError(1, null, 'file is empty')
    const header = rows[0].cells.map((h) => h.trim())
    const expected = datasetColumns[queryId] as ReadonlyArray<string>
    for (const col of header) {
      if (!expected.includes(col)) throw new DatasetValidationError(1, col, 'unexpected column')
    }
    for (const col of expected) {
      if (!header.includes(col)) throw new DatasetValidationError(1, col, 'missing column')
    }
    if (new Set(header).size !== header.length) {
      throw new DatasetValidationError(1, null, 'duplicate column in header')
    }
    const body = rows.slice(1)
    const records = body.map((r) => {
      if (r.cells.length !== header.length) {
        throw new DatasetValidationError(
          r.line,
          null,
          `expected ${header.length} columns, found ${r.cells.length}`,
        )
      }
      return Object.fromEntries(header.map((h, i) => [h, r.cells[i]]))
    })
    // Line numbers are file lines (header = 1), not record indexes.
    return validateRecords(queryId, records, (i) => body[i].line)
  },
}
