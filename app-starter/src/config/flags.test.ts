import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { appConfig } from './app'
import {
  isDemoMode,
  isDeployed,
  isOfficialDemoSite,
  isAuthEnabled,
  clearAuthEnabledCache,
  getDefaultRole,
  getAllowedSignupDomain,
  isPurgeEnabled,
  getRetentionDays,
} from './flags'

const { mockGetIdentityConfig } = vi.hoisted(() => ({
  mockGetIdentityConfig: vi.fn(),
}))

vi.mock('@netlify/identity', () => ({
  getIdentityConfig: mockGetIdentityConfig,
}))

describe('isDemoMode', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env = { ...original }
    delete process.env.NETLIFY_DEV
    delete process.env.SITE_ID
    delete process.env.DEMO_MODE
    delete process.env.NETLIFY_DB_URL
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('is true in local development', () => {
    expect(isDemoMode()).toBe(true)
    expect(isDeployed()).toBe(false)
  })

  it('is true under netlify dev, even when linked to a site', () => {
    process.env.NETLIFY_DEV = 'true'
    process.env.SITE_ID = 'user-site-id'

    expect(isDemoMode()).toBe(true)
    expect(isDeployed()).toBe(false)
  })

  it('is true on the official demo site', () => {
    process.env.SITE_ID = appConfig.officialDemoSiteId

    expect(isDemoMode()).toBe(true)
    expect(isDeployed()).toBe(true)
    expect(isOfficialDemoSite()).toBe(true)
  })

  it('is false on any other deploy, and ignores a stale DEMO_MODE=true', () => {
    process.env.SITE_ID = 'user-site-id'
    process.env.DEMO_MODE = 'true'

    expect(isDemoMode()).toBe(false)
    expect(isDeployed()).toBe(true)
    expect(isOfficialDemoSite()).toBe(false)
  })

  it('does not infer demo mode from NETLIFY_DB_URL', () => {
    process.env.NETLIFY_DB_URL = 'postgres://example'
    expect(isDemoMode()).toBe(true)

    process.env.SITE_ID = 'user-site-id'
    delete process.env.NETLIFY_DB_URL
    expect(isDemoMode()).toBe(false)
  })
})

describe('isAuthEnabled', () => {
  const original = { ...process.env }
  const identityUrl = 'https://example.netlify.app/.netlify/identity'
  const mockFetch = vi.fn()

  beforeEach(() => {
    process.env = { ...original }
    delete process.env.NETLIFY_DEV
    delete process.env.AUTH_DEV_USER
    delete process.env.SITE_ID
    process.env.SITE_ID = 'user-site-id'
    clearAuthEnabledCache()
    mockGetIdentityConfig.mockReturnValue({ url: identityUrl })
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = { ...original }
    mockGetIdentityConfig.mockReset()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('is true when the Identity settings endpoint answers', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    expect(await isAuthEnabled()).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(`${identityUrl}/settings`, expect.anything())
  })

  it('is false when Identity is off on the platform (settings endpoint 404s), even though the config URL exists', async () => {
    mockFetch.mockResolvedValue(new Response('Not found', { status: 404 }))

    expect(await isAuthEnabled()).toBe(false)
  })

  it('is false when no Identity context is available', async () => {
    mockGetIdentityConfig.mockReturnValue(null)

    expect(await isAuthEnabled()).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fails closed (true) on server errors and network failures, without caching them', async () => {
    mockFetch.mockResolvedValueOnce(new Response('', { status: 503 }))
    expect(await isAuthEnabled()).toBe(true)

    mockFetch.mockRejectedValueOnce(new Error('network down'))
    expect(await isAuthEnabled()).toBe(true)

    mockFetch.mockResolvedValueOnce(new Response('Not found', { status: 404 }))
    expect(await isAuthEnabled()).toBe(false)
  })

  it('caches definitive answers briefly', async () => {
    mockFetch.mockResolvedValue(new Response('{}', { status: 200 }))

    await isAuthEnabled()
    await isAuthEnabled()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('is false on the official demo site without asking the platform', async () => {
    process.env.SITE_ID = appConfig.officialDemoSiteId

    expect(await isAuthEnabled()).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('is false in local development without asking the platform', async () => {
    delete process.env.SITE_ID

    expect(await isAuthEnabled()).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('turns on under netlify dev when a fake auth user is configured', async () => {
    process.env.NETLIFY_DEV = 'true'
    process.env.AUTH_DEV_USER = '{"email":"you@example.com","roles":["admin"]}'

    expect(await isAuthEnabled()).toBe(true)
  })
})

describe('getDefaultRole', () => {
  afterEach(() => {
    delete process.env.DEFAULT_ROLE
  })

  it('throws when DEFAULT_ROLE is unset', () => {
    delete process.env.DEFAULT_ROLE
    expect(() => getDefaultRole()).toThrow(/DEFAULT_ROLE is not set/)
  })

  it('throws when DEFAULT_ROLE is an empty string', () => {
    process.env.DEFAULT_ROLE = ''
    expect(() => getDefaultRole()).toThrow(/DEFAULT_ROLE is not set/)
  })

  it('returns the configured value', () => {
    process.env.DEFAULT_ROLE = 'member'
    expect(getDefaultRole()).toBe('member')
  })
})

describe('getAllowedSignupDomain', () => {
  afterEach(() => {
    delete process.env.ALLOWED_SIGNUP_DOMAIN
  })

  it('is undefined by default (no restriction)', () => {
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    expect(getAllowedSignupDomain()).toBeUndefined()
  })

  it('is undefined when set to an empty/whitespace string', () => {
    process.env.ALLOWED_SIGNUP_DOMAIN = '   '
    expect(getAllowedSignupDomain()).toBeUndefined()
  })

  it('returns the configured domain, trimmed and lowercased', () => {
    process.env.ALLOWED_SIGNUP_DOMAIN = '  Acme.Com  '
    expect(getAllowedSignupDomain()).toBe('acme.com')
  })
})

describe('isPurgeEnabled', () => {
  beforeEach(() => {
    delete process.env.PURGE_ENABLED
  })

  it('is false by default', () => {
    expect(isPurgeEnabled()).toBe(false)
  })

  it('is true only when PURGE_ENABLED is exactly "true"', () => {
    process.env.PURGE_ENABLED = 'true'
    expect(isPurgeEnabled()).toBe(true)

    process.env.PURGE_ENABLED = 'yes'
    expect(isPurgeEnabled()).toBe(false)
  })
})

describe('getRetentionDays', () => {
  afterEach(() => {
    delete process.env.RECORD_RETENTION_DAYS
  })

  it('throws when RECORD_RETENTION_DAYS is unset', () => {
    delete process.env.RECORD_RETENTION_DAYS
    expect(() => getRetentionDays()).toThrow(/RECORD_RETENTION_DAYS is not set/)
  })

  it('throws when RECORD_RETENTION_DAYS is zero, negative, or non-numeric', () => {
    process.env.RECORD_RETENTION_DAYS = '0'
    expect(() => getRetentionDays()).toThrow()

    process.env.RECORD_RETENTION_DAYS = '-5'
    expect(() => getRetentionDays()).toThrow()

    process.env.RECORD_RETENTION_DAYS = 'not-a-number'
    expect(() => getRetentionDays()).toThrow()
  })

  it('returns the configured value', () => {
    process.env.RECORD_RETENTION_DAYS = '30'
    expect(getRetentionDays()).toBe(30)
  })
})
