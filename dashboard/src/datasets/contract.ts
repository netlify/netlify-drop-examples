import { z } from 'zod'
import { stageNames, type DatasetId } from '@/config/dashboard'

export type { DatasetId }
export const datasetIds = ['opportunities', 'arr_snapshots'] as const satisfies ReadonlyArray<DatasetId>

/**
 * The data contract. Columns are an EXACT allowlist: a missing or extra
 * column fails closed, which is how account names and other identifying
 * fields are kept out of the app.
 */
export const opportunityColumns = [
  'id',
  'owner',
  'stage',
  'amount',
  'created_date',
  'close_date',
  'segment',
  'source',
  'status',
] as const

export const arrSnapshotColumns = ['account_id', 'month', 'arr'] as const

export const datasetColumns = {
  opportunities: opportunityColumns,
  arr_snapshots: arrSnapshotColumns,
} as const

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, 'not a real calendar date')

const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, 'expected a non-negative number')
  .transform(Number)

const text = (max = 120) => z.string().trim().min(1, 'must not be empty').max(max)

export const opportunityRowSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'expected an opaque ID (letters, digits, _ or -)'),
  owner: text(),
  stage: z.string().refine((v) => stageNames.includes(v), `expected one of: ${stageNames.join(', ')}`),
  amount: money,
  created_date: isoDate,
  close_date: isoDate,
  segment: text(60),
  source: text(60),
  status: z.enum(['open', 'won', 'lost']),
})

export const arrSnapshotRowSchema = z.object({
  // Opaque ID only — no spaces, which blocks name-like values.
  account_id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'expected an opaque ID with no spaces'),
  month: isoDate.transform((v) => `${v.slice(0, 7)}-01`),
  arr: money,
})

export type OpportunityRow = z.output<typeof opportunityRowSchema>
export type ArrSnapshotRow = z.output<typeof arrSnapshotRowSchema>

export type RowsFor<Q extends DatasetId> = Q extends 'opportunities'
  ? Array<OpportunityRow>
  : Array<ArrSnapshotRow>

export const datasetSchemas = {
  opportunities: opportunityRowSchema,
  arr_snapshots: arrSnapshotRowSchema,
} as const

export class DatasetValidationError extends Error {
  constructor(
    public row: number,
    public column: string | null,
    message: string,
  ) {
    super(row > 0 ? `Row ${row}${column ? `, column \`${column}\`` : ''}: ${message}` : message)
    this.name = 'DatasetValidationError'
  }
}

/**
 * Validates already-keyed records (Snowflake rows, CSV rows) against the
 * contract. `lineOf(i)` maps a 0-based record index to the number reported in
 * errors (1-based file line for CSV). Throws on the FIRST failure.
 */
export function validateRecords<Q extends DatasetId>(
  dataset: Q,
  records: Array<Record<string, string>>,
  lineOf: (index: number) => number = (i) => i + 1,
): RowsFor<Q> {
  const allowed = datasetColumns[dataset] as ReadonlyArray<string>
  const schema = datasetSchemas[dataset]
  const out: Array<unknown> = []
  records.forEach((record, i) => {
    const line = lineOf(i)
    for (const key of Object.keys(record)) {
      if (!allowed.includes(key)) throw new DatasetValidationError(line, key, 'unexpected column')
    }
    const parsed = schema.safeParse(record)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const column = String(issue.path[0] ?? '')
      const got = record[column]
      const detail = got === undefined ? 'missing' : `got '${got}'`
      throw new DatasetValidationError(line, column || null, `${issue.message}, ${detail}`)
    }
    out.push(parsed.data)
  })
  return out as RowsFor<Q>
}
