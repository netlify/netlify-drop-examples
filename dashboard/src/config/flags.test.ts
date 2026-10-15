import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isDemoMode,
  isDeployed,
  isOfficialDemoSite,
  isDataEncryptionKeySet,
  isAuthEnabled,
  getAllowedSignupDomain,
  isPurgeEnabled,
  getRetentionDays,
  getDataEncryptionKey,
  getSnowflakeConfig,
  getSalesforceConfig,
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
    delete process.env.NETLIFY_SITE_ID
    delete process.env.SITE_NAME
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('is true in local development when no Netlify site metadata is present', () => {
    expect(isDemoMode()).toBe(true)
  })

  it('is true under netlify dev, even when linked to a site', () => {
    process.env.NETLIFY_DEV = 'true'
    process.env.SITE_ID = 'user-site-id'
    process.env.SITE_NAME = 'user-site'

    expect(isDemoMode()).toBe(true)
  })

  it('is true on the canonical demo project by site ID', () => {
    process.env.SITE_ID = '480ddca5-1fd1-4784-b8c7-c889474b8cf9'
    process.env.SITE_NAME = 'renamed-demo-site'

    expect(isDemoMode()).toBe(true)
  })

  it('is true on the Pipeline & ARR demo project by site ID', () => {
    process.env.SITE_ID = '0572e062-b021-497b-babf-b653423e3c9a'
    process.env.SITE_NAME = 'renamed-pipeline-demo'

    expect(isDemoMode()).toBe(true)
  })

  it('is true on the canonical demo project by site name', () => {
    process.env.SITE_NAME = 'app-pack-template'

    expect(isDemoMode()).toBe(true)
  })

  it('is false on other deployed Netlify projects', () => {
    process.env.SITE_ID = 'user-site-id'
    process.env.SITE_NAME = 'user-site'

    expect(isDemoMode()).toBe(false)
    expect(isDeployed()).toBe(true)
    expect(isOfficialDemoSite()).toBe(false)
  })

  it('counts the canonical demo project as deployed and official', () => {
    process.env.SITE_ID = '0572e062-b021-497b-babf-b653423e3c9a'

    expect(isDeployed()).toBe(true)
    expect(isOfficialDemoSite()).toBe(true)
  })

  it('is not deployed or official under netlify dev, even on the demo site ID', () => {
    process.env.NETLIFY_DEV = 'true'
    process.env.SITE_ID = '0572e062-b021-497b-babf-b653423e3c9a'

    expect(isDeployed()).toBe(false)
    expect(isOfficialDemoSite()).toBe(false)
  })

  it('does not infer demo mode from NETLIFY_DB_URL', () => {
    process.env.NETLIFY_DB_URL = 'postgres://example'

    expect(isDemoMode()).toBe(true)
  })
})

describe('isAuthEnabled', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env = { ...original }
    delete process.env.NETLIFY_DEV
    delete process.env.AUTH_DEV_USER
    delete process.env.SITE_ID
    delete process.env.NETLIFY_SITE_ID
    delete process.env.SITE_NAME
    mockGetIdentityConfig.mockReturnValue(null)
  })

  afterEach(() => {
    process.env = { ...original }
    mockGetIdentityConfig.mockReset()
  })

  it('is false when Identity is not configured', () => {
    process.env.SITE_ID = 'user-site-id'
    process.env.SITE_NAME = 'user-site'

    expect(isAuthEnabled()).toBe(false)
  })

  it('is true when Netlify Identity config is available', () => {
    process.env.SITE_ID = 'user-site-id'
    process.env.SITE_NAME = 'user-site'
    mockGetIdentityConfig.mockReturnValue({ url: 'https://example.netlify.app/.netlify/identity' })

    expect(isAuthEnabled()).toBe(true)
  })

  it('is false on the demo project even if Identity config is discoverable', () => {
    process.env.SITE_NAME = 'app-pack-template'
    mockGetIdentityConfig.mockReturnValue({ url: 'https://app-pack-template.netlify.app/.netlify/identity' })

    expect(isAuthEnabled()).toBe(false)
  })

  it('turns on under netlify dev when a fake auth user is configured', () => {
    process.env.NETLIFY_DEV = 'true'
    process.env.AUTH_DEV_USER = '{"email":"you@example.com","roles":["admin"]}'

    expect(isAuthEnabled()).toBe(true)
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

describe('getDataEncryptionKey', () => {
  afterEach(() => {
    delete process.env.DATA_ENCRYPTION_KEY
  })

  it('fails closed when unset', () => {
    delete process.env.DATA_ENCRYPTION_KEY
    expect(() => getDataEncryptionKey()).toThrow(/DATA_ENCRYPTION_KEY is not set/)
  })

  it('rejects keys that are not 32 bytes', () => {
    process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(16).toString('base64')
    expect(() => getDataEncryptionKey()).toThrow(/32 bytes/)
  })

  it('returns the decoded 32-byte key', () => {
    process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
    expect(getDataEncryptionKey().equals(Buffer.alloc(32, 7))).toBe(true)
  })
})

describe('getSnowflakeConfig', () => {
  const vars = ['ACCOUNT', 'USER', 'PRIVATE_KEY', 'WAREHOUSE', 'ROLE', 'DATABASE', 'SCHEMA']
  afterEach(() => {
    for (const v of vars) delete process.env[`SNOWFLAKE_${v}`]
  })

  it('is null unless every variable is set', () => {
    for (const v of vars) process.env[`SNOWFLAKE_${v}`] = 'x'
    expect(getSnowflakeConfig()).not.toBeNull()
    delete process.env.SNOWFLAKE_ROLE
    expect(getSnowflakeConfig()).toBeNull()
  })

  it('accepts a one-line private key with literal \\n sequences', () => {
    for (const v of vars) process.env[`SNOWFLAKE_${v}`] = 'x'
    process.env.SNOWFLAKE_PRIVATE_KEY = 'line1\\nline2'
    expect(getSnowflakeConfig()?.privateKey).toBe('line1\nline2')
  })
})

describe('getSalesforceConfig', () => {
  const vars = ['INSTANCE_URL', 'CLIENT_ID', 'CLIENT_SECRET']
  afterEach(() => {
    for (const v of vars) delete process.env[`SALESFORCE_${v}`]
  })

  it('is null unless every variable is set', () => {
    for (const v of vars) process.env[`SALESFORCE_${v}`] = 'x'
    expect(getSalesforceConfig()).not.toBeNull()
    delete process.env.SALESFORCE_CLIENT_SECRET
    expect(getSalesforceConfig()).toBeNull()
  })

  it('strips trailing slashes from the instance URL', () => {
    for (const v of vars) process.env[`SALESFORCE_${v}`] = 'x'
    process.env.SALESFORCE_INSTANCE_URL = 'https://acme.my.salesforce.com/'
    expect(getSalesforceConfig()?.instanceUrl).toBe('https://acme.my.salesforce.com')
  })
})

describe('setup-state helpers', () => {
  afterEach(() => {
    delete process.env.DATA_ENCRYPTION_KEY
  })

  it('reports whether a valid DATA_ENCRYPTION_KEY is set', () => {
    delete process.env.DATA_ENCRYPTION_KEY
    expect(isDataEncryptionKeySet()).toBe(false)
    process.env.DATA_ENCRYPTION_KEY = 'too-short'
    expect(isDataEncryptionKeySet()).toBe(false)
    process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
    expect(isDataEncryptionKeySet()).toBe(true)
  })
})
