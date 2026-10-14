import { createHash, createPrivateKey, createPublicKey, createSign } from 'node:crypto'
import type { DatasetAdapter } from '@/datasets/adapter'
import { validateRecords, type DatasetId, type RowsFor } from '@/datasets/contract'
import { savedQueries, type SavedQueryId } from '@/config/saved-queries'
import type { SnowflakeConfig } from '@/config/flags'

/**
 * Snowflake via the SQL REST API with key-pair JWT auth — no driver
 * dependency (`snowflake-sdk` pulls in AWS/Azure/GCP clients we don't use),
 * just `fetch` + `node:crypto`. Ingestion side only; viewers never reach this.
 *
 * NOT verified against a live account (latency, account-identifier quirks).
 */
const POLL_DEADLINE_MS = 25_000
const POLL_INTERVAL_MS = 750

type FetchLike = typeof fetch

const b64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

/** JWT account part: uppercased, `.` replaced by `-`. */
export function jwtAccount(account: string) {
  return account.toUpperCase().replace(/\./g, '-')
}

export function publicKeyFingerprint(privateKeyPem: string): string {
  const pub = createPublicKey(createPrivateKey(privateKeyPem)).export({ type: 'spki', format: 'der' })
  return `SHA256:${createHash('sha256').update(pub).digest('base64')}`
}

export function createJwt(
  config: Pick<SnowflakeConfig, 'account' | 'user' | 'privateKey'>,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const qualified = `${jwtAccount(config.account)}.${config.user.toUpperCase()}`
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({
      iss: `${qualified}.${publicKeyFingerprint(config.privateKey)}`,
      sub: qualified,
      iat: nowSeconds,
      exp: nowSeconds + 59 * 60, // Snowflake allows at most 1 hour
    }),
  )
  const signature = createSign('RSA-SHA256')
    .update(`${header}.${payload}`)
    .sign(createPrivateKey(config.privateKey))
  return `${header}.${payload}.${b64url(signature)}`
}

type RowType = { name: string; type: string }
type StatementResponse = {
  statementHandle?: string
  message?: string
  data?: Array<Array<string | null>>
  resultSetMetaData?: {
    numRows?: number
    rowType: Array<RowType>
    partitionInfo?: Array<unknown>
  }
}

export type SnowflakeParams = { savedQueryId: SavedQueryId; params: unknown }

export function createSnowflakeAdapter(
  config: SnowflakeConfig,
  deps: { fetch?: FetchLike; sleep?: (ms: number) => Promise<void>; now?: () => number } = {},
): DatasetAdapter<SnowflakeParams> {
  const doFetch = deps.fetch ?? fetch
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  const now = deps.now ?? Date.now
  const base = `https://${config.account.toLowerCase()}.snowflakecomputing.com/api/v2/statements`

  const headers = () => ({
    Authorization: `Bearer ${createJwt(config)}`,
    'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT',
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'pipeline-arr-dashboard/1.0',
  })

  async function call(url: string, init?: RequestInit): Promise<{ status: number; body: StatementResponse }> {
    const res = await doFetch(url, { ...init, headers: headers() })
    const body = (await res.json().catch(() => ({}))) as StatementResponse
    if (res.status !== 200 && res.status !== 202) {
      throw new Error(`Snowflake request failed (${res.status}): ${body.message ?? 'no details'}`)
    }
    return { status: res.status, body }
  }

  return {
    async getDataset<Q extends DatasetId>(
      dataset: Q,
      { savedQueryId, params }: SnowflakeParams,
    ): Promise<RowsFor<Q>> {
      const saved = savedQueries[savedQueryId]
      if (!saved || saved.dataset !== dataset)
        throw new Error(`Saved query ${savedQueryId} does not load ${dataset}`)
      const parsed = saved.params.parse(params)
      const bindings = Object.fromEntries(
        saved.toBindings(parsed).map((value, i) => [String(i + 1), { type: 'TEXT', value }]),
      )

      let { status, body } = await call(base, {
        method: 'POST',
        body: JSON.stringify({
          statement: saved.sql,
          timeout: 25,
          warehouse: config.warehouse,
          role: config.role,
          database: config.database,
          schema: config.schema,
          bindings,
        }),
      })

      const deadline = now() + POLL_DEADLINE_MS
      while (status === 202) {
        if (!body.statementHandle) throw new Error('Snowflake returned 202 without a statement handle')
        if (now() > deadline)
          throw new Error('Snowflake query did not finish in time; use a smaller or aggregated query.')
        await sleep(POLL_INTERVAL_MS)
        ;({ status, body } = await call(`${base}/${body.statementHandle}`))
      }

      const meta = body.resultSetMetaData
      if (!meta) throw new Error('Snowflake response had no result metadata')
      const names = meta.rowType.map((c) => c.name.toLowerCase())
      const types = meta.rowType.map((c) => c.type.toLowerCase())
      const partitions = meta.partitionInfo?.length ?? 1
      const raw: Array<Array<string | null>> = [...(body.data ?? [])]
      for (let p = 1; p < partitions; p++) {
        const part = await call(`${base}/${body.statementHandle}?partition=${p}`)
        raw.push(...(part.body.data ?? []))
      }

      const records = raw.map((cells) => {
        const rec: Record<string, string> = {}
        cells.forEach((value, i) => {
          if (value === null) return
          // Safeguard: DATE columns arrive as epoch days unless formatted in SQL.
          rec[names[i]] =
            types[i] === 'date' && /^-?\d+$/.test(value)
              ? new Date(Number(value) * 86_400_000).toISOString().slice(0, 10)
              : value
        })
        return rec
      })
      // Row N is the Nth data row of the result set.
      return validateRecords(dataset, records)
    },
  }
}
