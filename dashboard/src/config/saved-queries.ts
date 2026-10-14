import { z } from 'zod'
import { dashboardConfig } from '@/config/dashboard'
import type { DatasetId } from '@/config/dashboard'

/**
 * SERVER-ONLY allowlist of Snowflake queries. The client only ever sends
 * `{ queryId, params }`; the id must exist here and params must pass the zod
 * schema. SQL is never taken from a request.
 *
 * The SELECT must return EXACTLY the contract columns (src/datasets/contract.ts)
 * — extra or missing columns fail validation. Dates are formatted to
 * YYYY-MM-DD in SQL (the REST API otherwise returns DATEs as epoch days), and
 * params are bound as text and converted with TO_DATE(?) so the binding type
 * never matters. Single statements only: multi-statement requests can't use
 * bindings.
 *
 * INFERRED: the view names below (OPPORTUNITIES_V, ARR_SNAPSHOTS_V) are
 * placeholders — point them at your own views. Database and schema come from
 * SNOWFLAKE_DATABASE / SNOWFLAKE_SCHEMA.
 */
type SavedQuery<P extends z.ZodType = z.ZodType> = {
  dataset: DatasetId
  sql: string
  params: P
  toBindings: (params: z.output<P>) => Array<string>
}

function define<P extends z.ZodType>(q: SavedQuery<P>): SavedQuery {
  return q as unknown as SavedQuery
}

export const savedQueries = {
  opportunities_v1: define({
    dataset: 'opportunities',
    sql: `SELECT id, owner, stage, amount,
       TO_VARCHAR(created_date, 'YYYY-MM-DD') AS created_date,
       TO_VARCHAR(close_date, 'YYYY-MM-DD') AS close_date,
       segment, source, status
FROM OPPORTUNITIES_V
WHERE close_date >= TO_DATE(?)`,
    params: z.object({ since: z.string().date() }),
    toBindings: (p: { since: string }) => [p.since],
  }),
  arr_snapshots_v1: define({
    dataset: 'arr_snapshots',
    sql: `SELECT account_id, TO_VARCHAR(month, 'YYYY-MM-DD') AS month, arr
FROM ARR_SNAPSHOTS_V
WHERE month >= TO_DATE(?)`,
    params: z.object({ since_month: z.string().date() }),
    toBindings: (p: { since_month: string }) => [p.since_month],
  }),
} satisfies Record<string, SavedQuery>

export type SavedQueryId = keyof typeof savedQueries

export function isSavedQueryId(id: string): id is SavedQueryId {
  return Object.prototype.hasOwnProperty.call(savedQueries, id)
}

/** The saved-query ids the config maps to each dataset (used by the Data page). */
export const datasetQueryIds = dashboardConfig.datasetQueries

/**
 * SERVER-ONLY Salesforce SOQL, same rule as above: nothing from a request is
 * ever interpolated. The only input is `since` (a date the server computes
 * from `dashboardConfig.salesforce.value.lookbackYears`), validated as
 * YYYY-MM-DD before it is placed in the query. SOQL date literals are
 * unquoted. The selected fields are mapped onto the contract columns by
 * src/datasets/adapters/salesforce.ts.
 */
const soqlField = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/

export const salesforceQueries = {
  opportunities_v1: {
    dataset: 'opportunities',
    soql: (since: string) => {
      const date = z.string().date().parse(since)
      const segment = dashboardConfig.salesforce.value.segmentField
      if (!soqlField.test(segment)) throw new Error('salesforce.segmentField must be a plain field path')
      return `SELECT Id, Owner.Name, StageName, Amount, CreatedDate, CloseDate, LeadSource, IsClosed, IsWon, ${segment}
FROM Opportunity
WHERE CloseDate >= ${date} AND Amount != null`
    },
  },
} as const satisfies Record<string, { dataset: DatasetId; soql: (since: string) => string }>
