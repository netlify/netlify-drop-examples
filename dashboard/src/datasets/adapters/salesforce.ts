import type { DatasetAdapter } from '@/datasets/adapter'
import { validateRecords, type DatasetId, type RowsFor } from '@/datasets/contract'
import { salesforceQueries } from '@/config/saved-queries'
import { dashboardConfig } from '@/config/dashboard'
import type { SalesforceConfig } from '@/config/flags'

/**
 * Salesforce via the REST API with the OAuth 2.0 client credentials flow —
 * no SDK, just `fetch`. Opportunities only. Ingestion side only; viewers
 * never reach this.
 *
 * NOT verified against a live org.
 */
export const SALESFORCE_API_VERSION = 'v62.0'
const DEADLINE_MS = 25_000

type FetchLike = typeof fetch
type SfRecord = Record<string, unknown>
type QueryResponse = { done: boolean; nextRecordsUrl?: string; records: Array<SfRecord> }
type SfError = { errorCode?: string; error?: string }

export type SalesforceParams = { since: string }

/** Reads a dotted relationship path (`Owner.Name`) from a SOQL record. */
function field(record: SfRecord, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((v, key) => (v && typeof v === 'object' ? (v as SfRecord)[key] : undefined), record)
}

const str = (v: unknown) => (v === null || v === undefined ? undefined : String(v))

/** Maps one Opportunity onto the contract columns; validation happens after. */
export function toOpportunityRecord(record: SfRecord): Record<string, string> {
  const { stageMap, closedStage, segmentField } = dashboardConfig.salesforce.value
  const closed = record.IsClosed === true
  const stageName = str(record.StageName) ?? ''
  const rec: Record<string, string | undefined> = {
    id: str(record.Id),
    owner: str(field(record, 'Owner.Name')),
    // An unmapped open stage passes through unchanged so validation fails
    // closed and names it.
    stage: closed ? closedStage : (stageMap[stageName] ?? stageName),
    amount: str(record.Amount),
    created_date: str(record.CreatedDate)?.slice(0, 10),
    close_date: str(record.CloseDate),
    segment: str(field(record, segmentField)),
    source: str(record.LeadSource) || 'Unknown',
    status: record.IsWon === true ? 'won' : closed ? 'lost' : 'open',
  }
  return Object.fromEntries(Object.entries(rec).filter(([, v]) => v !== undefined)) as Record<string, string>
}

export function createSalesforceAdapter(
  config: SalesforceConfig,
  deps: { fetch?: FetchLike; now?: () => number } = {},
): DatasetAdapter<SalesforceParams> {
  const doFetch = deps.fetch ?? fetch
  const now = deps.now ?? Date.now

  // Error messages carry the status and Salesforce error code only — never
  // the token, secret, or record data.
  async function failed(what: string, res: Response): Promise<never> {
    const body = (await res.json().catch(() => null)) as SfError | Array<SfError> | null
    const first = Array.isArray(body) ? body[0] : body
    throw new Error(
      `Salesforce ${what} failed (${res.status}): ${first?.errorCode ?? first?.error ?? 'no details'}`,
    )
  }

  async function token(): Promise<string> {
    const res = await doFetch(`${config.instanceUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    })
    if (!res.ok) return failed('token request', res)
    const body = (await res.json()) as { access_token?: string }
    if (!body.access_token) throw new Error('Salesforce token response had no access_token')
    return body.access_token
  }

  return {
    async getDataset<Q extends DatasetId>(dataset: Q, { since }: SalesforceParams): Promise<RowsFor<Q>> {
      const query = salesforceQueries.opportunities_v1
      if (query.dataset !== dataset) throw new Error(`Salesforce does not load ${dataset}`)
      const deadline = now() + DEADLINE_MS
      const headers = { Authorization: `Bearer ${await token()}`, Accept: 'application/json' }

      const records: Array<SfRecord> = []
      let path: string | undefined =
        `/services/data/${SALESFORCE_API_VERSION}/query?q=${encodeURIComponent(query.soql(since))}`
      while (path) {
        if (now() > deadline) throw new Error('Salesforce query did not finish in time; narrow the lookback.')
        const res = await doFetch(`${config.instanceUrl}${path}`, { headers })
        if (!res.ok) await failed('query', res)
        const body = (await res.json()) as QueryResponse
        records.push(...body.records)
        path = body.done ? undefined : body.nextRecordsUrl
      }

      // Row N is the Nth record returned.
      return validateRecords(dataset, records.map(toOpportunityRecord))
    },
  }
}
