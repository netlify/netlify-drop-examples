import { describe, it, expect, vi } from 'vitest'

const listUsers = vi.fn()
vi.mock('@netlify/identity', () => ({
  admin: { listUsers },
}))

const { hasAnyUsers } = await import('./first-user')

describe('hasAnyUsers', () => {
  it('is false when no Identity user exists yet', async () => {
    listUsers.mockResolvedValue([])
    expect(await hasAnyUsers()).toBe(false)
  })

  it('is true once at least one Identity user exists', async () => {
    listUsers.mockResolvedValue([{ id: 'u1' }])
    expect(await hasAnyUsers()).toBe(true)
  })
})

const { hasOtherConfirmedUser } = await import('./first-user')

describe('hasOtherConfirmedUser', () => {
  const confirmed = '2026-10-15T00:00:00Z'

  it('is false when only the signing-up user is listed', async () => {
    listUsers.mockResolvedValue([{ id: 'me', confirmedAt: confirmed }])
    expect(await hasOtherConfirmedUser('me')).toBe(false)
  })

  it('ignores other accounts that never confirmed', async () => {
    listUsers.mockResolvedValue([{ id: 'me' }, { id: 'other' }])
    expect(await hasOtherConfirmedUser('me')).toBe(false)
  })

  it('is true when another confirmed user exists', async () => {
    listUsers.mockResolvedValue([{ id: 'me' }, { id: 'other', confirmedAt: confirmed }])
    expect(await hasOtherConfirmedUser('me')).toBe(true)
  })
})
