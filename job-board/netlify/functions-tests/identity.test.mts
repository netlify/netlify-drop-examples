// @vitest-environment node
//
// Lives outside netlify/functions/ (not next to the file it tests) because
// Netlify's function bundler treats every file in that directory as a
// deployable function — a co-located *.test.mts would get bundled as its
// own "function" and fail the build on this file's top-level `await`.
import { describe, it, expect, afterEach, vi } from 'vitest'

const listUsers = vi.fn()
vi.mock('@netlify/identity', () => ({
  admin: { listUsers },
}))

const { default: identity } = await import('../functions/identity.mjs')

function fakeEvent(email: string | undefined) {
  return {
    user: { id: 'u1', email, appMetadata: {} },
    deny: vi.fn(() => undefined),
  }
}

describe('identity signup hook', () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
    listUsers.mockReset()
  })

  it('assigns DEFAULT_ROLE when ALLOWED_SIGNUP_DOMAIN is unset and a user already exists', async () => {
    process.env.DEFAULT_ROLE = 'member'
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    listUsers.mockResolvedValue([{ id: 'existing' }])
    const event = fakeEvent('someone@example.com')

    const result = await identity.userSignup(event as never)

    expect(event.deny).not.toHaveBeenCalled()
    expect(result?.user.appMetadata?.roles).toEqual(['member'])
  })

  it('allows a signup whose email domain matches ALLOWED_SIGNUP_DOMAIN exactly (case-insensitive)', async () => {
    process.env.DEFAULT_ROLE = 'member'
    process.env.ALLOWED_SIGNUP_DOMAIN = 'acme.com'
    listUsers.mockResolvedValue([{ id: 'existing' }])
    const event = fakeEvent('someone@Acme.com')

    const result = await identity.userSignup(event as never)

    expect(event.deny).not.toHaveBeenCalled()
    expect(result?.user.appMetadata?.roles).toEqual(['member'])
  })

  it('denies a signup whose email domain does not match', async () => {
    process.env.DEFAULT_ROLE = 'member'
    process.env.ALLOWED_SIGNUP_DOMAIN = 'acme.com'
    const event = fakeEvent('someone@other.com')

    await identity.userSignup(event as never)

    expect(event.deny).toHaveBeenCalledTimes(1)
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('denies a subdomain, since matching is exact-domain only', async () => {
    process.env.DEFAULT_ROLE = 'member'
    process.env.ALLOWED_SIGNUP_DOMAIN = 'acme.com'
    const event = fakeEvent('someone@sub.acme.com')

    await identity.userSignup(event as never)

    expect(event.deny).toHaveBeenCalledTimes(1)
  })

  it('denies a signup with no email when a domain restriction is configured', async () => {
    process.env.DEFAULT_ROLE = 'member'
    process.env.ALLOWED_SIGNUP_DOMAIN = 'acme.com'
    const event = fakeEvent(undefined)

    await identity.userSignup(event as never)

    expect(event.deny).toHaveBeenCalledTimes(1)
  })

  it('assigns appConfig.adminRole to the first-ever signup', async () => {
    process.env.DEFAULT_ROLE = 'member'
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    listUsers.mockResolvedValue([])
    const event = fakeEvent('first@example.com')

    const result = await identity.userSignup(event as never)

    expect(result?.user.appMetadata?.roles).toEqual(['admin'])
  })

  it('falls back to DEFAULT_ROLE if the admin API call fails', async () => {
    process.env.DEFAULT_ROLE = 'member'
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    listUsers.mockRejectedValue(new Error('identity admin API unreachable'))
    const event = fakeEvent('someone@example.com')

    const result = await identity.userSignup(event as never)

    expect(result?.user.appMetadata?.roles).toEqual(['member'])
  })
})
