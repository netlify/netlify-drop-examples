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

const CONFIRMED = '2026-10-15T00:00:00Z'

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

  it('assigns the member role when ALLOWED_SIGNUP_DOMAIN is unset and a user already exists', async () => {
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    listUsers.mockResolvedValue([{ id: 'existing', confirmedAt: CONFIRMED }])
    const event = fakeEvent('someone@example.com')

    const result = await identity.userSignup(event as never)

    expect(event.deny).not.toHaveBeenCalled()
    expect(result?.user.appMetadata?.roles).toEqual(['member'])
  })

  it('allows a signup whose email domain matches ALLOWED_SIGNUP_DOMAIN exactly (case-insensitive)', async () => {
    process.env.ALLOWED_SIGNUP_DOMAIN = 'acme.com'
    listUsers.mockResolvedValue([{ id: 'existing', confirmedAt: CONFIRMED }])
    const event = fakeEvent('someone@Acme.com')

    const result = await identity.userSignup(event as never)

    expect(event.deny).not.toHaveBeenCalled()
    expect(result?.user.appMetadata?.roles).toEqual(['member'])
  })

  it('denies a signup whose email domain does not match', async () => {
    process.env.ALLOWED_SIGNUP_DOMAIN = 'acme.com'
    const event = fakeEvent('someone@other.com')

    await identity.userSignup(event as never)

    expect(event.deny).toHaveBeenCalledTimes(1)
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('denies a subdomain, since matching is exact-domain only', async () => {
    process.env.ALLOWED_SIGNUP_DOMAIN = 'acme.com'
    const event = fakeEvent('someone@sub.acme.com')

    await identity.userSignup(event as never)

    expect(event.deny).toHaveBeenCalledTimes(1)
  })

  it('denies a signup with no email when a domain restriction is configured', async () => {
    process.env.ALLOWED_SIGNUP_DOMAIN = 'acme.com'
    const event = fakeEvent(undefined)

    await identity.userSignup(event as never)

    expect(event.deny).toHaveBeenCalledTimes(1)
  })

  it('assigns appConfig.adminRole to the first-ever signup', async () => {
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    listUsers.mockResolvedValue([])
    const event = fakeEvent('first@example.com')

    const result = await identity.userSignup(event as never)

    expect(result?.user.appMetadata?.roles).toEqual(['admin'])
  })

  it('makes the first person to confirm the admin even when their own record is listed', async () => {
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    listUsers.mockResolvedValue([{ id: 'u1', confirmedAt: CONFIRMED }])
    const event = fakeEvent('first@example.com')

    const result = await identity.userSignup(event as never)

    expect(result?.user.appMetadata?.roles).toEqual(['admin'])
  })

  it('does not let an unconfirmed account block the first admin', async () => {
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    listUsers.mockResolvedValue([{ id: 'u1', confirmedAt: CONFIRMED }, { id: 'pending' }])
    const event = fakeEvent('first@example.com')

    const result = await identity.userSignup(event as never)

    expect(result?.user.appMetadata?.roles).toEqual(['admin'])
  })

  it('falls back to the member role if the admin API call fails', async () => {
    delete process.env.ALLOWED_SIGNUP_DOMAIN
    listUsers.mockRejectedValue(new Error('identity admin API unreachable'))
    const event = fakeEvent('someone@example.com')

    const result = await identity.userSignup(event as never)

    expect(result?.user.appMetadata?.roles).toEqual(['member'])
  })
})
