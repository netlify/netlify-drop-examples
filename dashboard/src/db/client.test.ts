import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { sql } from 'drizzle-orm'

const { query, neon } = vi.hoisted(() => {
  const query = vi.fn(async (_text: string) => ({ rows: [{ one: 1 }], fields: [], rowCount: 1 }))
  // Mirrors @neondatabase/serverless 1.x: the client only accepts tagged
  // templates, and `.query()` is the conventional-call form.
  const neon = vi.fn(() => {
    const client = () => {
      throw new Error('This function can now be called only as a tagged-template function')
    }
    return Object.assign(client, { query })
  })
  return { query, neon }
})

vi.mock('@neondatabase/serverless', () => ({
  neon,
  Pool: class {},
}))

import { getDb } from './client'

describe('getDb', () => {
  const original = { ...process.env }

  beforeEach(() => {
    process.env.NETLIFY_DB_URL = 'postgres://user:pass@db.example.com/app'
    delete process.env.NETLIFY_DB_DRIVER
    query.mockClear()
  })

  afterEach(() => {
    process.env = { ...original }
  })

  it('runs queries through the Neon client`s query() form', async () => {
    await getDb().execute(sql`select 1 as one`)
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][0]).toBe('select 1 as one')
  })
})
