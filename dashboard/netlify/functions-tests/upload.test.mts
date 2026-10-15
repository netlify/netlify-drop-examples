// @vitest-environment node
//
// Netlify Functions run in Node/Deno, not a browser — and jsdom's `File`
// polyfill is a different class identity than the `File` instances Node's
// fetch/FormData multipart parser produces, which breaks the handler's
// `file instanceof File` check under the default jsdom environment.
//
// Lives outside netlify/functions/ (not next to the file it tests) because
// Netlify's function bundler treats every file in that directory as a
// deployable function — a co-located *.test.mts would get bundled as its
// own "function" and fail the build on this file's top-level `await`.
import { describe, it, expect, afterEach, vi } from 'vitest'

const { mockRoles, mockGetUser, mockGetIdentityConfig, mockStore } = vi.hoisted(() => ({
  mockRoles: { current: [] as string[] },
  mockGetUser: vi.fn(),
  mockGetIdentityConfig: vi.fn((): unknown => null),
  mockStore: { set: vi.fn() },
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

const { default: handler } = await import('../functions/upload.mjs')

function uploadRequest() {
  const body = new FormData()
  body.set('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }))
  return new Request('http://localhost/api/upload', { method: 'POST', body })
}

function mockDeployedSite() {
  process.env.SITE_ID = 'user-site-id'
  process.env.SITE_NAME = 'user-site'
  // Identity is on for this site: the settings endpoint answers.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 200 })),
  )
}

describe('upload function authorization', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllGlobals()
    mockRoles.current = []
    mockGetUser.mockReset()
    mockGetIdentityConfig.mockReset()
    mockGetIdentityConfig.mockReturnValue(null)
    mockStore.set.mockReset()
  })

  it('403s when Identity is not configured, even if uploadAllowedRoles is configured', async () => {
    mockRoles.current = ['admin']

    const res = await handler(uploadRequest())

    expect(res.status).toBe(403)
    expect(mockStore.set).not.toHaveBeenCalled()
  })

  it('403s when Identity is configured but uploadAllowedRoles is empty', async () => {
    mockDeployedSite()
    mockGetIdentityConfig.mockReturnValue({ url: 'https://example.netlify.app/.netlify/identity' })
    mockRoles.current = []
    mockGetUser.mockResolvedValue({ id: '1', email: 'user@example.com', roles: ['admin'] })

    const res = await handler(uploadRequest())

    expect(res.status).toBe(403)
    expect(mockStore.set).not.toHaveBeenCalled()
  })

  it('403s when the authenticated user has none of the allowed roles', async () => {
    mockDeployedSite()
    mockGetIdentityConfig.mockReturnValue({ url: 'https://example.netlify.app/.netlify/identity' })
    mockRoles.current = ['admin', 'recruiter']
    mockGetUser.mockResolvedValue({ id: '1', email: 'user@example.com', roles: ['viewer'] })

    const res = await handler(uploadRequest())

    expect(res.status).toBe(403)
    expect(mockStore.set).not.toHaveBeenCalled()
  })

  it('401s when Identity is configured, roles are configured, but there is no session', async () => {
    mockDeployedSite()
    mockGetIdentityConfig.mockReturnValue({ url: 'https://example.netlify.app/.netlify/identity' })
    mockRoles.current = ['admin']
    mockGetUser.mockResolvedValue(null)

    const res = await handler(uploadRequest())

    expect(res.status).toBe(401)
    expect(mockStore.set).not.toHaveBeenCalled()
  })

  it('proceeds to store the file when the user has an allowed role', async () => {
    mockDeployedSite()
    mockGetIdentityConfig.mockReturnValue({ url: 'https://example.netlify.app/.netlify/identity' })
    mockRoles.current = ['admin', 'recruiter']
    mockGetUser.mockResolvedValue({ id: '1', email: 'user@example.com', roles: ['recruiter'] })

    const res = await handler(uploadRequest())

    expect(res.status).toBe(200)
    expect(mockStore.set).toHaveBeenCalledTimes(1)
    const body = await res.json()
    expect(body.key).toMatch(/hello\.txt$/)
  })
})
