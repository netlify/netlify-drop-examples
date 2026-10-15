// @vitest-environment node
//
// Role gating for the dataset functions. Lives outside netlify/functions/
// for the same reason as upload.test.mts.
import { describe, it, expect, afterEach, vi } from 'vitest'

const { mockGetUser, mockGetIdentityConfig, mockIngest, mockGetBatch, mockGetRaw } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetIdentityConfig: vi.fn((): unknown => null),
  mockIngest: vi.fn(),
  mockGetBatch: vi.fn(),
  mockGetRaw: vi.fn(),
}))

vi.mock('@netlify/identity', () => ({ getUser: mockGetUser, getIdentityConfig: mockGetIdentityConfig }))
vi.mock('../../src/data/datasets', () => ({ ingestBatch: mockIngest, getBatch: mockGetBatch }))
vi.mock('../../src/data/audit', () => ({ insertAudit: vi.fn() }))
vi.mock('../../src/lib/dataset-blobs', () => ({ getRawDataset: mockGetRaw }))

const { default: refresh } = await import('../functions/snowflake-refresh.mjs')
const { default: raw } = await import('../functions/dataset-raw.mjs')
const { default: sfRefresh } = await import('../functions/salesforce-refresh.mjs')
const { default: sfScheduled } = await import('../functions/salesforce-scheduled-refresh.mjs')

const sfReq = () => new Request('http://localhost/api/datasets/refresh/salesforce', { method: 'POST' })
function salesforceConfigured() {
  process.env.SALESFORCE_INSTANCE_URL = 'https://acme.my.salesforce.com'
  process.env.SALESFORCE_CLIENT_ID = 'cid'
  process.env.SALESFORCE_CLIENT_SECRET = 'secret'
}
const sfOpp = {
  Id: '006A',
  Owner: { Name: 'Avery' },
  StageName: 'Prospecting',
  Amount: 100,
  CreatedDate: '2026-01-02T00:00:00.000+0000',
  CloseDate: '2026-03-01',
  LeadSource: 'Web',
  IsClosed: false,
  IsWon: false,
  Account: { Type: 'SMB' },
}

const refreshReq = () =>
  new Request('http://localhost/api/datasets/refresh', {
    method: 'POST',
    body: JSON.stringify({ queryId: 'arr_snapshots_v1', params: { since_month: '2025-01-01' } }),
  })
const rawCtx = { params: { batchId: 'b1' } } as never

function deployed(roles: Array<string> | null) {
  process.env.SITE_ID = 'user-site-id'
  process.env.SITE_NAME = 'user-site'
  mockGetIdentityConfig.mockReturnValue({ url: 'https://x.netlify.app/.netlify/identity' })
  // Identity is on for this site: the settings endpoint answers.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 200 })),
  )
  mockGetUser.mockResolvedValue(roles ? { id: '1', email: 'u@example.com', roles } : null)
}

describe('dataset function authorization', () => {
  const env = { ...process.env }
  afterEach(() => {
    process.env = { ...env }
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    mockGetIdentityConfig.mockReturnValue(null)
  })

  it('both 403 when Identity is not enabled (fail closed)', async () => {
    expect((await refresh(refreshReq())).status).toBe(403)
    expect((await raw(new Request('http://localhost/x'), rawCtx)).status).toBe(403)
  })

  it('both 401 without a session', async () => {
    deployed(null)
    expect((await refresh(refreshReq())).status).toBe(401)
    expect((await raw(new Request('http://localhost/x'), rawCtx)).status).toBe(401)
  })

  it('both 403 for viewers', async () => {
    deployed(['viewer'])
    expect((await refresh(refreshReq())).status).toBe(403)
    expect((await raw(new Request('http://localhost/x'), rawCtx)).status).toBe(403)
    expect(mockIngest).not.toHaveBeenCalled()
    expect(mockGetRaw).not.toHaveBeenCalled()
  })

  it('refresh passes the role gate for editors, then reports Snowflake as unconfigured', async () => {
    deployed(['editor'])
    expect((await refresh(refreshReq())).status).toBe(409)
  })

  it('raw download 404s for editors when the batch has no raw file', async () => {
    deployed(['editor'])
    mockGetBatch.mockResolvedValue({ id: 'b1', blobKey: null })
    expect((await raw(new Request('http://localhost/x'), rawCtx)).status).toBe(404)
  })

  it('raw download streams the decrypted file for editors', async () => {
    deployed(['editor'])
    mockGetBatch.mockResolvedValue({ id: 'b1', dataset: 'arr_snapshots', rowCount: 1, blobKey: 'k' })
    mockGetRaw.mockResolvedValue(Buffer.from('account_id,month,arr\n'))
    const res = await raw(new Request('http://localhost/x'), rawCtx)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('account_id,month,arr\n')
  })

  it('salesforce refresh: 403 without Identity, 403 for viewers, 409 for editors when unconfigured', async () => {
    expect((await sfRefresh(sfReq())).status).toBe(403)
    deployed(['viewer'])
    expect((await sfRefresh(sfReq())).status).toBe(403)
    deployed(['editor'])
    expect((await sfRefresh(sfReq())).status).toBe(409)
    expect(mockIngest).not.toHaveBeenCalled()
  })

  it('scheduled salesforce refresh skips when unconfigured', async () => {
    const res = await sfScheduled(new Request('http://localhost/'))
    expect(await res.json()).toMatchObject({ ok: true, skipped: expect.any(String) })
    expect(mockIngest).not.toHaveBeenCalled()
  })

  it('scheduled salesforce refresh ingests as the system role', async () => {
    salesforceConfigured()
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (url) =>
        Response.json(
          String(url).endsWith('/token') ? { access_token: 'tok' } : { done: true, records: [sfOpp] },
        ),
      )
    mockIngest.mockResolvedValue({
      batch: { id: 'b2', dataset: 'opportunities', rowCount: 1, source: 'salesforce' },
      previous: null,
    })
    const res = await sfScheduled(new Request('http://localhost/'))
    fetchSpy.mockRestore()
    expect(await res.json()).toEqual({ ok: true, batchId: 'b2', rowCount: 1 })
    expect(mockIngest).toHaveBeenCalledWith(
      'opportunities',
      [expect.objectContaining({ id: '006A', stage: 'Prospecting', status: 'open' })],
      { source: 'salesforce', actor: undefined, role: 'system' },
    )
  })
})
