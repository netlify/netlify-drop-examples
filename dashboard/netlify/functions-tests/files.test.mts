// @vitest-environment node
//
// Lives outside netlify/functions/ (not next to the file it tests) because
// Netlify's function bundler treats every file in that directory as a
// deployable function — a co-located *.test.mts would get bundled as its
// own "function" and fail the build on this file's top-level `await`.
import { describe, it, expect, afterEach, vi } from 'vitest'
import type { Context } from '@netlify/functions'

const { mockRoles, mockGetUser, mockGetIdentityConfig, mockStore } = vi.hoisted(() => ({
  mockRoles: { current: [] as string[] },
  mockGetUser: vi.fn(),
  mockGetIdentityConfig: vi.fn((): unknown => null),
  mockStore: { getWithMetadata: vi.fn() },
}))

vi.mock('../../src/config/app', () => ({
  appConfig: {
    get uploadAllowedRoles() {
      return mockRoles.current
    },
    adminRole: 'admin',
  },
}))

vi.mock('@netlify/identity', () => ({
  getUser: mockGetUser,
  getIdentityConfig: mockGetIdentityConfig,
}))

vi.mock('@netlify/blobs', () => ({
  getStore: () => mockStore,
}))

const { default: handler } = await import('../functions/files.mjs')

function downloadRequest(key: string) {
  const req = new Request(`http://localhost/api/files/${key}`)
  const context = { params: { key } } as unknown as Context
  return handler(req, context)
}

function mockDeployedSite() {
  process.env.SITE_ID = 'user-site-id'
  process.env.SITE_NAME = 'user-site'
}

describe('files function authorization', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    mockRoles.current = []
    mockGetUser.mockReset()
    mockGetIdentityConfig.mockReset()
    mockGetIdentityConfig.mockReturnValue(null)
    mockStore.getWithMetadata.mockReset()
  })

  it('403s when Identity is not configured, even if uploadAllowedRoles is configured', async () => {
    mockRoles.current = ['admin']

    const res = await downloadRequest('some-key')

    expect(res.status).toBe(403)
    expect(mockStore.getWithMetadata).not.toHaveBeenCalled()
  })

  it('403s when Identity is configured but uploadAllowedRoles is empty', async () => {
    mockDeployedSite()
    mockGetIdentityConfig.mockReturnValue({ url: 'https://example.netlify.app/.netlify/identity' })
    mockRoles.current = []
    mockGetUser.mockResolvedValue({ id: '1', email: 'user@example.com', roles: ['admin'] })

    const res = await downloadRequest('some-key')

    expect(res.status).toBe(403)
    expect(mockStore.getWithMetadata).not.toHaveBeenCalled()
  })

  it('403s when the authenticated user has none of the allowed roles', async () => {
    mockDeployedSite()
    mockGetIdentityConfig.mockReturnValue({ url: 'https://example.netlify.app/.netlify/identity' })
    mockRoles.current = ['admin', 'recruiter']
    mockGetUser.mockResolvedValue({ id: '1', email: 'user@example.com', roles: ['viewer'] })

    const res = await downloadRequest('some-key')

    expect(res.status).toBe(403)
    expect(mockStore.getWithMetadata).not.toHaveBeenCalled()
  })

  it('proceeds to read from Blobs when the user has an allowed role', async () => {
    mockDeployedSite()
    mockGetIdentityConfig.mockReturnValue({ url: 'https://example.netlify.app/.netlify/identity' })
    mockRoles.current = ['admin', 'recruiter']
    mockGetUser.mockResolvedValue({ id: '1', email: 'user@example.com', roles: ['recruiter'] })
    mockStore.getWithMetadata.mockResolvedValue({
      data: new ReadableStream(),
      metadata: { type: 'text/plain' },
    })

    const res = await downloadRequest('some-key')

    expect(res.status).toBe(200)
    expect(mockStore.getWithMetadata).toHaveBeenCalledTimes(1)
  })
})
