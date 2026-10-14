import type { DatasetId, RowsFor } from '@/datasets/contract'

/**
 * Adapters are used on the INGESTION side only. Dashboard views read from the
 * database cache (src/server/dashboard.ts), so viewers can never trigger a
 * warehouse query.
 */
export interface DatasetAdapter<P = unknown> {
  getDataset<Q extends DatasetId>(queryId: Q, params: P): Promise<RowsFor<Q>>
}
