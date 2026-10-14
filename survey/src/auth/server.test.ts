import { randomUUID } from 'node:crypto'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { auditRead } from './server'
import { listAudit } from '@/data/audit'
import { listSurveys, getSurvey } from '@/data/surveys'

const { mockGetIdentityConfig, mockGetUser } = vi.hoisted(() => ({
  mockGetIdentityConfig: vi.fn((): unknown => null),
  mockGetUser: vi.fn(),
}))

vi.mock('@netlify/identity', () => ({
  getIdentityConfig: mockGetIdentityConfig,
  getUser: mockGetUser,
}))

describe('auditRead', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
    mockGetIdentityConfig.mockReset()
    mockGetIdentityConfig.mockReturnValue(null)
    mockGetUser.mockReset()
  })

  function enableAuditedSession() {
    process.env.NETLIFY_DEV = 'true'
    process.env.AUTH_DEV_USER = JSON.stringify({ email: 'tester@example.com', roles: ['admin'] })
  }

  it('writes a correctly-shaped read entry when called directly', async () => {
    enableAuditedSession()
    const entityId = randomUUID()

    await auditRead('employee-record.viewed', 'employee-record', entityId)

    const [latest] = await listAudit()
    expect(latest).toMatchObject({
      action: 'employee-record.viewed',
      entity: 'employee-record',
      entityId,
      actorEmail: 'tester@example.com',
      before: null,
      after: null,
    })
    expect(latest.createdAt).toBeInstanceOf(Date)
  })

  it('is a no-op when auth is not enabled', async () => {
    delete process.env.NETLIFY_DEV
    delete process.env.AUTH_DEV_USER
    const before = (await listAudit()).length

    await auditRead('employee-record.viewed', 'employee-record', randomUUID())

    expect((await listAudit()).length).toBe(before)
  })

  it('produces zero new audit entries when calling the existing surveys getters, proving read-logging stays opt-in', async () => {
    enableAuditedSession()

    const before = (await listAudit()).length
    const surveys = await listSurveys()
    if (surveys[0]) {
      await getSurvey(surveys[0].id)
    }

    expect((await listAudit()).length).toBe(before)
  })
})
