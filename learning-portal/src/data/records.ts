// To point this app at another data source, edit this file only. Demo
// writes live in memory and reset on cold start.

import { randomUUID } from 'node:crypto'
import { eq, and, desc, isNotNull, lt } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { getDb } from '@/db/client'
import { records, type RecordRow, type NewRecord } from '@/db/schema'
import { notDeleted, isNotDeleted } from '@/db/soft-delete'
import { seedRecords } from '@/data/demo/seed'

export type RecordInput = Omit<NewRecord, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

function toRow(input: NewRecord & { id: string }): RecordRow {
  const now = new Date()
  return {
    title: input.title,
    status: input.status ?? 'draft',
    owner: input.owner,
    amount: input.amount ?? '0',
    dueDate: input.dueDate ?? null,
    notes: input.notes ?? null,
    id: input.id,
    createdAt: now,
    updatedAt: now,
    deletedAt: input.deletedAt ?? null,
  }
}

// In-memory store for demo mode. Resets whenever the server cold-starts.
let demoRecords: Array<RecordRow> = seedRecords.map(toRow)

function sortByCreatedDesc(rows: Array<RecordRow>) {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function listRecords(): Promise<Array<RecordRow>> {
  if (isDemoMode()) {
    return sortByCreatedDesc(demoRecords.filter(isNotDeleted))
  }
  const db = getDb()
  return db
    .select()
    .from(records)
    .where(notDeleted(records.deletedAt))
    .orderBy(desc(records.createdAt))
}

export async function getRecord(id: string): Promise<RecordRow | undefined> {
  if (isDemoMode()) {
    return demoRecords.find((r) => r.id === id && isNotDeleted(r))
  }
  const db = getDb()
  const [row] = await db
    .select()
    .from(records)
    .where(and(eq(records.id, id), notDeleted(records.deletedAt)))
  return row
}

export async function createRecord(input: RecordInput): Promise<RecordRow> {
  if (isDemoMode()) {
    const row = toRow({ ...input, id: randomUUID() })
    demoRecords = [row, ...demoRecords]
    return row
  }
  const db = getDb()
  const [row] = await db.insert(records).values(input).returning()
  return row
}

export async function updateRecord(id: string, patch: Partial<RecordInput>): Promise<RecordRow | undefined> {
  if (isDemoMode()) {
    // Guard against resurrecting a soft-deleted row's fields via a direct
    // call that bypasses the (already-404ing) detail-page loader — matches
    // the DB branch's `notDeleted` condition below.
    const index = demoRecords.findIndex((r) => r.id === id && isNotDeleted(r))
    if (index === -1) return undefined
    const updated: RecordRow = { ...demoRecords[index], ...patch, updatedAt: new Date() }
    demoRecords = [...demoRecords.slice(0, index), updated, ...demoRecords.slice(index + 1)]
    return updated
  }
  const db = getDb()
  const [row] = await db
    .update(records)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(records.id, id), notDeleted(records.deletedAt)))
    .returning()
  return row
}

/**
 * Soft delete — marks the row `deletedAt` instead of removing it, so it's
 * recoverable (an operator can null out `deletedAt` by hand; the base
 * template ships no restore UI). See README > Soft delete for why this is
 * always on, not configurable. Returns the updated row (with `deletedAt`
 * set) on success, or `undefined` if `id` doesn't exist or is already
 * soft-deleted.
 */
export async function deleteRecord(id: string): Promise<RecordRow | undefined> {
  if (isDemoMode()) {
    const index = demoRecords.findIndex((r) => r.id === id && isNotDeleted(r))
    if (index === -1) return undefined
    const updated: RecordRow = { ...demoRecords[index], deletedAt: new Date() }
    demoRecords = [...demoRecords.slice(0, index), updated, ...demoRecords.slice(index + 1)]
    return updated
  }
  const db = getDb()
  const [row] = await db
    .update(records)
    .set({ deletedAt: new Date() })
    .where(and(eq(records.id, id), notDeleted(records.deletedAt)))
    .returning()
  return row
}

/**
 * Hard purge — permanently removes records that were soft-deleted more than
 * `retentionDays` ago. Only ever called by the scheduled function
 * (`netlify/functions/purge-deleted-records.mts`), which itself only runs
 * when `PURGE_ENABLED=true` (see `src/config/flags.ts`). Demo mode has no
 * durable soft-delete state worth purging (it resets on cold start anyway),
 * so it's a no-op there.
 */
export async function purgeExpiredRecords(retentionDays: number): Promise<Array<RecordRow>> {
  if (isDemoMode()) {
    return []
  }
  const db = getDb()
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  return db
    .delete(records)
    .where(and(isNotNull(records.deletedAt), lt(records.deletedAt, cutoff)))
    .returning()
}
