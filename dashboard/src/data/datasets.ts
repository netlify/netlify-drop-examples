// To point this app at another data source, edit this file only. Demo
// writes live in memory and reset on cold start.
//
// All dataset reads/writes against the real database go through
// `withDbRole` (src/db/rls.ts) so Postgres row-level security sees the
// caller's role, and sensitive columns (owner, amount, ARR) are encrypted
// with src/lib/crypto.ts before they are stored.

import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNotNull, lt } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { arrSnapshots, datasetBatches, opportunities, type DatasetBatch } from '@/db/schema'
import { notDeleted } from '@/db/soft-delete'
import { withDbRole, type DbRole } from '@/db/rls'
import { decryptString, encryptString } from '@/lib/crypto'
import { seedArrSnapshots, seedOpportunities } from '@/data/demo/seed'
import type { ArrSnapshotRow, DatasetId, OpportunityRow, RowsFor } from '@/datasets/contract'

export type BatchSource = 'csv' | 'snowflake' | 'salesforce' | 'seed'
export type IngestMeta = {
  source: BatchSource
  blobKey?: string | null
  actor?: { id?: string | null; email?: string | null }
  role: DbRole
}

// ---- demo-mode in-memory store --------------------------------------------

type Demo = {
  batches: Array<DatasetBatch>
  rows: { opportunities: Array<OpportunityRow>; arr_snapshots: Array<ArrSnapshotRow> }
}
let demo: Demo | undefined

function demoStore(): Demo {
  if (!demo) {
    const opps = seedOpportunities()
    const snaps = seedArrSnapshots()
    const now = new Date()
    const batch = (dataset: DatasetId, rowCount: number): DatasetBatch => ({
      id: randomUUID(),
      dataset,
      source: 'seed',
      rowCount,
      blobKey: null,
      createdById: null,
      createdByEmail: null,
      createdAt: now,
      deletedAt: null,
    })
    demo = {
      batches: [batch('opportunities', opps.length), batch('arr_snapshots', snaps.length)],
      rows: { opportunities: opps, arr_snapshots: snaps },
    }
  }
  return demo
}

// ---- writes ----------------------------------------------------------------

const CHUNK = 1000

/**
 * Full-replace load: creates a new batch, soft-deletes the previous active
 * batch for the dataset and inserts the rows — in one transaction. Rows hang
 * off `batch_id` with ON DELETE CASCADE, so a later purge removes them too.
 */
export async function ingestBatch<Q extends DatasetId>(
  dataset: Q,
  rows: RowsFor<Q>,
  meta: IngestMeta,
): Promise<{ batch: DatasetBatch; previous: DatasetBatch | null }> {
  const base = {
    dataset,
    source: meta.source,
    rowCount: rows.length,
    blobKey: meta.blobKey ?? null,
    createdById: meta.actor?.id ?? null,
    createdByEmail: meta.actor?.email ?? null,
  }

  if (isDemoMode()) {
    const store = demoStore()
    const batch: DatasetBatch = { ...base, id: randomUUID(), createdAt: new Date(), deletedAt: null }
    const previous = store.batches.find((b) => b.dataset === dataset && b.deletedAt === null) ?? null
    store.batches = [
      batch,
      ...store.batches.map((b) => (b === previous ? { ...b, deletedAt: new Date() } : b)),
    ]
    ;(store.rows[dataset] as Array<unknown>) = rows as Array<unknown>
    return { batch, previous }
  }

  return withDbRole(meta.role, async (tx) => {
    const [previous] = await tx
      .select()
      .from(datasetBatches)
      .where(and(eq(datasetBatches.dataset, dataset), notDeleted(datasetBatches.deletedAt)))
    const [batch] = await tx.insert(datasetBatches).values(base).returning()

    if (dataset === 'opportunities') {
      const opps = rows as Array<OpportunityRow>
      for (let i = 0; i < opps.length; i += CHUNK) {
        await tx.insert(opportunities).values(
          opps.slice(i, i + CHUNK).map((o) => ({
            batchId: batch.id,
            id: o.id,
            ownerEnc: encryptString(o.owner),
            stage: o.stage,
            amountEnc: encryptString(String(o.amount)),
            createdDate: o.created_date,
            closeDate: o.close_date,
            segment: o.segment,
            source: o.source,
            status: o.status,
          })),
        )
      }
    } else {
      const snaps = rows as Array<ArrSnapshotRow>
      for (let i = 0; i < snaps.length; i += CHUNK) {
        await tx.insert(arrSnapshots).values(
          snaps.slice(i, i + CHUNK).map((s) => ({
            batchId: batch.id,
            accountId: s.account_id,
            month: s.month,
            arrEnc: encryptString(String(s.arr)),
          })),
        )
      }
    }

    if (previous) {
      await tx.update(datasetBatches).set({ deletedAt: new Date() }).where(eq(datasetBatches.id, previous.id))
    }
    return { batch, previous: previous ?? null }
  })
}

// ---- reads -----------------------------------------------------------------

/** The active (not soft-deleted) batch per dataset — drives "Last updated". */
export async function getActiveBatches(role: DbRole): Promise<Record<DatasetId, DatasetBatch | null>> {
  if (isDemoMode()) {
    const active = (d: DatasetId) =>
      demoStore().batches.find((b) => b.dataset === d && b.deletedAt === null) ?? null
    return { opportunities: active('opportunities'), arr_snapshots: active('arr_snapshots') }
  }
  const rows = await withDbRole(role, (tx) =>
    tx
      .select()
      .from(datasetBatches)
      .where(notDeleted(datasetBatches.deletedAt))
      .orderBy(desc(datasetBatches.createdAt)),
  )
  const first = (d: DatasetId) => rows.find((b) => b.dataset === d) ?? null
  return { opportunities: first('opportunities'), arr_snapshots: first('arr_snapshots') }
}

/** Batch history (including replaced batches) for the Data page. */
export async function listBatches(
  dataset: DatasetId,
  role: DbRole,
  limit = 20,
): Promise<Array<DatasetBatch>> {
  if (isDemoMode()) {
    return demoStore()
      .batches.filter((b) => b.dataset === dataset)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }
  return withDbRole(role, (tx) =>
    tx
      .select()
      .from(datasetBatches)
      .where(eq(datasetBatches.dataset, dataset))
      .orderBy(desc(datasetBatches.createdAt))
      .limit(limit),
  )
}

export async function getBatch(id: string, role: DbRole): Promise<DatasetBatch | undefined> {
  if (isDemoMode()) return demoStore().batches.find((b) => b.id === id)
  const [row] = await withDbRole(role, (tx) =>
    tx.select().from(datasetBatches).where(eq(datasetBatches.id, id)),
  )
  return row
}

/**
 * Per-deal rows, decrypted. SERVER-ONLY: only `src/server/dashboard.ts`
 * calls these, and it aggregates before anything crosses to the client.
 */
export async function loadOpportunities(role: DbRole): Promise<Array<OpportunityRow>> {
  if (isDemoMode()) return demoStore().rows.opportunities
  return withDbRole(role, async (tx) => {
    const rows = await tx
      .select()
      .from(opportunities)
      .innerJoin(datasetBatches, eq(opportunities.batchId, datasetBatches.id))
      .where(and(eq(datasetBatches.dataset, 'opportunities'), notDeleted(datasetBatches.deletedAt)))
    return rows.map(({ opportunities: o }) => ({
      id: o.id,
      owner: decryptString(o.ownerEnc),
      stage: o.stage,
      amount: Number(decryptString(o.amountEnc)),
      created_date: o.createdDate,
      close_date: o.closeDate,
      segment: o.segment,
      source: o.source,
      status: o.status as OpportunityRow['status'],
    }))
  })
}

export async function loadArrSnapshots(role: DbRole): Promise<Array<ArrSnapshotRow>> {
  if (isDemoMode()) return demoStore().rows.arr_snapshots
  return withDbRole(role, async (tx) => {
    const rows = await tx
      .select()
      .from(arrSnapshots)
      .innerJoin(datasetBatches, eq(arrSnapshots.batchId, datasetBatches.id))
      .where(and(eq(datasetBatches.dataset, 'arr_snapshots'), notDeleted(datasetBatches.deletedAt)))
    return rows.map(({ arr_snapshots: s }) => ({
      account_id: s.accountId,
      month: s.month,
      arr: Number(decryptString(s.arrEnc)),
    }))
  })
}

// ---- purge -----------------------------------------------------------------

/**
 * Hard purge — permanently removes batches that were soft-deleted more than
 * `retentionDays` ago; their rows go with them (ON DELETE CASCADE). Only
 * called by the scheduled function, which only runs when `PURGE_ENABLED=true`.
 * Runs as the `system` role (the only role with a DELETE policy). Demo mode
 * has nothing durable to purge.
 */
export async function purgeExpiredBatches(retentionDays: number): Promise<Array<{ id: string }>> {
  if (isDemoMode()) return []
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  return withDbRole('system', async (tx) => {
    const expired = await tx
      .select({ id: datasetBatches.id })
      .from(datasetBatches)
      .where(and(isNotNull(datasetBatches.deletedAt), lt(datasetBatches.deletedAt, cutoff)))
    if (expired.length === 0) return []
    await tx.delete(datasetBatches).where(
      inArray(
        datasetBatches.id,
        expired.map((b) => b.id),
      ),
    )
    return expired
  })
}
