import { randomUUID } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireDataAccess, audit } from '@/auth/server'
import { appConfig } from '@/config/app'
import { isDemoMode, isSalesforceEnabled, isSnowflakeEnabled } from '@/config/flags'
import { getActiveBatches, ingestBatch, listBatches } from '@/data/datasets'
import { csvAdapter } from '@/datasets/adapters/csv'
import { DatasetValidationError, datasetIds, type DatasetId } from '@/datasets/contract'
import type { DatasetBatch } from '@/db/schema'
import { putRawDataset } from '@/lib/dataset-blobs'

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // 4 MB — Netlify Functions request body limit.

const batchMeta = (b: DatasetBatch | null | undefined) =>
  b ? { dataset: b.dataset, rowCount: b.rowCount, source: b.source } : null

export type UploadResult =
  | { ok: true; batchId: string; rowCount: number }
  | { ok: false; row: number | null; column: string | null; message: string }

/**
 * CSV upload. Validates the whole file against the contract FIRST — on any
 * failure nothing is stored and the first offending row/column is returned.
 * On success: encrypt + store the raw file, full-replace ingest, audit (with
 * counts only, never row contents).
 */
export const uploadDatasetServer = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error('Expected form data')
    const dataset = z.enum(datasetIds).parse(data.get('dataset'))
    const file = data.get('file')
    if (!(file instanceof File)) throw new Error('Choose a CSV file to upload.')
    return { dataset, file }
  })
  .handler(async ({ data }): Promise<UploadResult> => {
    const { user, dbRole } = await requireDataAccess(appConfig.dataEditorRoles)
    const { dataset, file } = data
    if (file.size > MAX_UPLOAD_BYTES) {
      return { ok: false, row: null, column: null, message: 'File exceeds the 4 MB upload limit.' }
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    let rows
    try {
      rows = await csvAdapter.getDataset(dataset, { text: buffer.toString('utf8') })
    } catch (err) {
      if (err instanceof DatasetValidationError) {
        return { ok: false, row: err.row, column: err.column, message: err.message }
      }
      throw err
    }

    const blobKey = isDemoMode() ? null : `${dataset}/${randomUUID()}.csv`
    if (blobKey) await putRawDataset(blobKey, buffer, { dataset, uploadedBy: user?.email ?? 'unknown' })

    const { batch, previous } = await ingestBatch(dataset, rows, {
      source: 'csv',
      blobKey,
      actor: { id: user?.id, email: user?.email },
      role: dbRole,
    })
    await audit('dataset.uploaded', 'dataset_batch', batch.id, batchMeta(previous), batchMeta(batch))
    return { ok: true, batchId: batch.id, rowCount: batch.rowCount }
  })

export type BatchSummary = {
  id: string
  source: string
  rowCount: number
  createdAt: string
  createdByEmail: string | null
  active: boolean
  hasRaw: boolean
}

/** Batch history for the Data page: who/when/source/rows only, never contents. */
export const getDataPageServer = createServerFn({ method: 'GET' }).handler(async () => {
  const { dbRole } = await requireDataAccess(appConfig.dataEditorRoles)
  const history = {} as Record<DatasetId, Array<BatchSummary>>
  const active = await getActiveBatches(dbRole)
  for (const dataset of datasetIds) {
    history[dataset] = (await listBatches(dataset, dbRole)).map((b) => ({
      id: b.id,
      source: b.source,
      rowCount: b.rowCount,
      createdAt: b.createdAt.toISOString(),
      createdByEmail: b.createdByEmail,
      active: active[dataset]?.id === b.id,
      hasRaw: b.blobKey !== null,
    }))
  }
  return { history, snowflakeEnabled: isSnowflakeEnabled(), salesforceEnabled: isSalesforceEnabled() }
})
