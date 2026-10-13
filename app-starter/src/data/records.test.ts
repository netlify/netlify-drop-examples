import { describe, it, expect } from 'vitest'

// Tests run without Netlify site metadata, so data/records.ts takes the
// in-memory branch here — no database needed.
import { listRecords, getRecord, createRecord, updateRecord, deleteRecord } from './records'
import { seedRecords } from './demo/seed'

describe('records (demo mode)', () => {
  it('lists the seeded records', async () => {
    const records = await listRecords()
    expect(records.length).toBeGreaterThanOrEqual(seedRecords.length)
  })

  it('gets a record by id', async () => {
    const [first] = await listRecords()
    const found = await getRecord(first.id)
    expect(found?.id).toBe(first.id)
  })

  it('returns undefined for an unknown id', async () => {
    const found = await getRecord('00000000-0000-0000-0000-000000000000')
    expect(found).toBeUndefined()
  })

  it('creates a record and it appears in the list', async () => {
    const before = await listRecords()
    const created = await createRecord({
      title: 'New thing',
      status: 'draft',
      owner: 'Test Owner',
      amount: '10.00',
    })
    expect(created.id).toBeTruthy()
    expect(created.title).toBe('New thing')

    const after = await listRecords()
    expect(after.length).toBe(before.length + 1)
  })

  it('updates a record', async () => {
    const created = await createRecord({
      title: 'To update',
      status: 'draft',
      owner: 'Owner',
      amount: '5.00',
    })
    const updated = await updateRecord(created.id, { title: 'Updated title' })
    expect(updated?.title).toBe('Updated title')
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
  })

  it('returns undefined when updating an unknown id', async () => {
    const result = await updateRecord('00000000-0000-0000-0000-000000000000', { title: 'x' })
    expect(result).toBeUndefined()
  })

  it('soft-deletes a record', async () => {
    const created = await createRecord({
      title: 'To delete',
      status: 'draft',
      owner: 'Owner',
      amount: '1.00',
    })
    const deleted = await deleteRecord(created.id)
    expect(deleted?.deletedAt).not.toBeNull()

    // Soft-deleted rows are excluded from the default query, same as a
    // truly-missing id.
    const found = await getRecord(created.id)
    expect(found).toBeUndefined()
  })

  it('returns undefined when deleting an unknown id', async () => {
    const deleted = await deleteRecord('00000000-0000-0000-0000-000000000000')
    expect(deleted).toBeUndefined()
  })

  it('refuses to update a soft-deleted record', async () => {
    const created = await createRecord({
      title: 'To delete then edit',
      status: 'draft',
      owner: 'Owner',
      amount: '1.00',
    })
    await deleteRecord(created.id)

    // The `notDeleted` guard on updateRecord's WHERE clause (see
    // src/data/records.ts) means a soft-deleted row can't be silently
    // resurrected via an edit that bypasses the (already-404ing)
    // detail-page loader — the update matches zero rows, same as an
    // update against a genuinely unknown id.
    const result = await updateRecord(created.id, { title: 'Should not apply' })
    expect(result).toBeUndefined()
  })
})
