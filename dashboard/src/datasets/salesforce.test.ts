import { describe, it, expect, vi } from 'vitest'
import { createSalesforceAdapter, toOpportunityRecord } from '@/datasets/adapters/salesforce'
import { DatasetValidationError } from '@/datasets/contract'
import type { SalesforceConfig } from '@/config/flags'

const config: SalesforceConfig = {
  instanceUrl: 'https://acme.my.salesforce.com',
  clientId: 'cid',
  clientSecret: 'super-secret',
}

const opp = (over: Record<string, unknown> = {}) => ({
  attributes: { type: 'Opportunity' },
  Id: '006Hs00001AbCdEIAV',
  Owner: { Name: 'Avery Lindqvist' },
  StageName: 'Proposal/Price Quote',
  Amount: 24000,
  CreatedDate: '2026-07-14T09:12:00.000+0000',
  CloseDate: '2026-10-30',
  LeadSource: 'Web',
  IsClosed: false,
  IsWon: false,
  Account: { Type: 'Mid-Market' },
  ...over,
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function mockFetch(...pages: Array<Response>) {
  return vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    void url
    return String(url).endsWith('/services/oauth2/token')
      ? json({ access_token: 'tok', instance_url: config.instanceUrl })
      : pages.shift()!
  })
}

describe('toOpportunityRecord', () => {
  it('maps stage, status, dates and defaults onto the contract columns', () => {
    expect(toOpportunityRecord(opp())).toEqual({
      id: '006Hs00001AbCdEIAV',
      owner: 'Avery Lindqvist',
      stage: 'Proposal',
      amount: '24000',
      created_date: '2026-07-14',
      close_date: '2026-10-30',
      segment: 'Mid-Market',
      source: 'Web',
      status: 'open',
    })
    expect(toOpportunityRecord(opp({ StageName: 'Closed Won', IsClosed: true, IsWon: true }))).toMatchObject({
      stage: 'Commit',
      status: 'won',
    })
    expect(toOpportunityRecord(opp({ StageName: 'Closed Lost', IsClosed: true }))).toMatchObject({
      stage: 'Commit',
      status: 'lost',
    })
    expect(toOpportunityRecord(opp({ LeadSource: null })).source).toBe('Unknown')
  })
})

describe('createSalesforceAdapter', () => {
  it('requests a client-credentials token, then follows nextRecordsUrl', async () => {
    const fetch = mockFetch(
      json({ done: false, nextRecordsUrl: '/services/data/v62.0/query/01gXX-2000', records: [opp()] }),
      json({ done: true, records: [opp({ Id: '006Hs00001AbCdFIAV' })] }),
    )
    const rows = await createSalesforceAdapter(config, { fetch }).getDataset('opportunities', {
      since: '2023-01-01',
    })
    expect(rows.map((r) => r.id)).toEqual(['006Hs00001AbCdEIAV', '006Hs00001AbCdFIAV'])
    expect(rows[0].amount).toBe(24000)

    const [tokenUrl, tokenInit] = fetch.mock.calls[0]
    expect(tokenUrl).toBe('https://acme.my.salesforce.com/services/oauth2/token')
    expect(Object.fromEntries(tokenInit!.body as URLSearchParams)).toEqual({
      grant_type: 'client_credentials',
      client_id: 'cid',
      client_secret: 'super-secret',
    })

    const query = decodeURIComponent(String(fetch.mock.calls[1][0]))
    expect(query).toContain('FROM Opportunity')
    expect(query).toContain('CloseDate >= 2023-01-01')
    expect(fetch.mock.calls[1][1]!.headers).toMatchObject({ Authorization: 'Bearer tok' })
    expect(fetch.mock.calls[2][0]).toBe('https://acme.my.salesforce.com/services/data/v62.0/query/01gXX-2000')
  })

  it('fails closed on an unmapped open stage', async () => {
    const fetch = mockFetch(json({ done: true, records: [opp({ StageName: 'Custom Stage' })] }))
    const err = await createSalesforceAdapter(config, { fetch })
      .getDataset('opportunities', { since: '2023-01-01' })
      .catch((e) => e)
    expect(err).toBeInstanceOf(DatasetValidationError)
    expect(err.column).toBe('stage')
  })

  it('rejects datasets other than opportunities and malformed dates', async () => {
    const adapter = createSalesforceAdapter(config, { fetch: mockFetch() })
    await expect(adapter.getDataset('arr_snapshots', { since: '2023-01-01' })).rejects.toThrow(
      'does not load arr_snapshots',
    )
    await expect(
      adapter.getDataset('opportunities', { since: "2023-01-01' OR Id != null" }),
    ).rejects.toThrow()
  })

  it('surfaces the error code but never the secret', async () => {
    const fetch = vi.fn(async () => json({ error: 'invalid_client', error_description: 'bad' }, 400))
    const err: Error = await createSalesforceAdapter(config, { fetch })
      .getDataset('opportunities', { since: '2023-01-01' })
      .catch((e) => e)
    expect(err.message).toBe('Salesforce token request failed (400): invalid_client')
    expect(err.message).not.toContain('super-secret')

    const queryFail = mockFetch(json([{ errorCode: 'INVALID_FIELD', message: 'No such column' }], 400))
    await expect(
      createSalesforceAdapter(config, { fetch: queryFail }).getDataset('opportunities', {
        since: '2023-01-01',
      }),
    ).rejects.toThrow('Salesforce query failed (400): INVALID_FIELD')
  })

  it('gives up after the deadline', async () => {
    let t = 0
    const fetch = vi.fn(async (url: string | URL | Request) => {
      t += 30_000
      return String(url).endsWith('/token')
        ? json({ access_token: 'tok' })
        : json({ done: false, nextRecordsUrl: '/next', records: [] })
    })
    await expect(
      createSalesforceAdapter(config, { fetch, now: () => t }).getDataset('opportunities', {
        since: '2023-01-01',
      }),
    ).rejects.toThrow('did not finish in time')
  })
})
