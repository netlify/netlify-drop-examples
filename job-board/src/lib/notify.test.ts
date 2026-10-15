import { describe, it, expect, vi, beforeEach } from 'vitest'
import { notify } from './notify'

describe('notify', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200 })),
    )
  })

  it('accepts a valid slack payload and posts to /api/notify', async () => {
    await notify({ channel: 'slack', subject: 'Hello', body: 'World' })
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/notify'),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('rejects an invalid channel', async () => {
    // @ts-expect-error intentionally invalid input for the test
    await expect(notify({ channel: 'sms', subject: 'x', body: 'y' })).rejects.toThrow()
  })

  it('rejects a missing subject', async () => {
    // @ts-expect-error intentionally invalid input for the test
    await expect(notify({ channel: 'email', body: 'y' })).rejects.toThrow()
  })

  it('rejects an invalid "to" email', async () => {
    await expect(notify({ channel: 'email', subject: 's', body: 'b', to: 'not-an-email' })).rejects.toThrow()
  })
})
