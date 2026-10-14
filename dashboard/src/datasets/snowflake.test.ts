import { describe, it, expect, vi } from 'vitest'
import { generateKeyPairSync, createPublicKey, createHash, createVerify } from 'node:crypto'
import { createJwt, createSnowflakeAdapter, publicKeyFingerprint } from '@/datasets/adapters/snowflake'
import type { SnowflakeConfig } from '@/config/flags'

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
const config: SnowflakeConfig = {
  account: 'myorg.my.account',
  user: 'svc_dash',
  privateKey,
  warehouse: 'WH',
  role: 'DASH_RO',
  database: 'DB',
  schema: 'PUBLIC',
}
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString())

describe('createJwt', () => {
  it('builds Snowflake key-pair claims and a verifiable RS256 signature', () => {
    const jwt = createJwt(config, 1_000)
    const [h, p, sig] = jwt.split('.')
    const fp = `SHA256:${createHash('sha256')
      .update(createPublicKey(publicKey).export({ type: 'spki', format: 'der' }))
      .digest('base64')}`
    expect(fp).toBe(publicKeyFingerprint(privateKey))
    expect(decode(h)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decode(p)).toEqual({
      iss: `MYORG-MY-ACCOUNT.SVC_DASH.${fp}`,
      sub: 'MYORG-MY-ACCOUNT.SVC_DASH',
      iat: 1_000,
      exp: 1_000 + 59 * 60,
    })
    expect(
      createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(sig, 'base64url')),
    ).toBe(true)
  })
})

const rowType = [
  { name: 'ACCOUNT_ID', type: 'text' },
  { name: 'MONTH', type: 'text' },
  { name: 'ARR', type: 'fixed' },
]
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

describe('snowflake adapter', () => {
  it('submits bound params, polls a 202, and fetches every partition', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(202, { statementHandle: 'h1' }))
      .mockResolvedValueOnce(
        json(200, {
          statementHandle: 'h1',
          resultSetMetaData: { rowType, partitionInfo: [{}, {}] },
          data: [['acct_1', '2026-01-01', '100']],
        }),
      )
      .mockResolvedValueOnce(json(200, { data: [['acct_2', '2026-01-01', '50.5']] }))
    const adapter = createSnowflakeAdapter(config, { fetch: fetchMock, sleep: async () => {} })

    const rows = await adapter.getDataset('arr_snapshots', {
      savedQueryId: 'arr_snapshots_v1',
      params: { since_month: '2025-01-01' },
    })

    expect(rows).toEqual([
      { account_id: 'acct_1', month: '2026-01-01', arr: 100 },
      { account_id: 'acct_2', month: '2026-01-01', arr: 50.5 },
    ])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://myorg.my.account.snowflakecomputing.com/api/v2/statements')
    expect(init.headers['X-Snowflake-Authorization-Token-Type']).toBe('KEYPAIR_JWT')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ warehouse: 'WH', role: 'DASH_RO', database: 'DB', schema: 'PUBLIC' })
    expect(body.bindings).toEqual({ '1': { type: 'TEXT', value: '2025-01-01' } })
    expect(fetchMock.mock.calls[1][0]).toMatch(/statements\/h1$/)
    expect(fetchMock.mock.calls[2][0]).toMatch(/statements\/h1\?partition=1$/)
  })

  it('validates rows against the contract (extra column fails closed)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json(200, {
        resultSetMetaData: { rowType: [...rowType, { name: 'ACCOUNT_NAME', type: 'text' }] },
        data: [['acct_1', '2026-01-01', '1', 'Acme']],
      }),
    )
    const adapter = createSnowflakeAdapter(config, { fetch: fetchMock })
    await expect(
      adapter.getDataset('arr_snapshots', {
        savedQueryId: 'arr_snapshots_v1',
        params: { since_month: '2025-01-01' },
      }),
    ).rejects.toMatchObject({ column: 'account_name' })
  })

  it('rejects bad params, mismatched datasets and API errors', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => json(422, { message: 'SQL compilation error' }))
    const adapter = createSnowflakeAdapter(config, { fetch: fetchMock })
    await expect(
      adapter.getDataset('arr_snapshots', {
        savedQueryId: 'arr_snapshots_v1',
        params: { since_month: 'nope' },
      }),
    ).rejects.toThrow()
    await expect(
      adapter.getDataset('opportunities', {
        savedQueryId: 'arr_snapshots_v1',
        params: { since_month: '2025-01-01' },
      }),
    ).rejects.toThrow(/does not load/)
    await expect(
      adapter.getDataset('arr_snapshots', {
        savedQueryId: 'arr_snapshots_v1',
        params: { since_month: '2025-01-01' },
      }),
    ).rejects.toThrow(/422.*SQL compilation error/)
  })

  it('gives up when the statement never finishes', async () => {
    let t = 0
    const fetchMock = vi.fn().mockImplementation(async () => json(202, { statementHandle: 'h' }))
    const adapter = createSnowflakeAdapter(config, {
      fetch: fetchMock,
      sleep: async () => {},
      now: () => (t += 10_000),
    })
    await expect(
      adapter.getDataset('arr_snapshots', {
        savedQueryId: 'arr_snapshots_v1',
        params: { since_month: '2025-01-01' },
      }),
    ).rejects.toThrow(/did not finish/)
  })
})
