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
