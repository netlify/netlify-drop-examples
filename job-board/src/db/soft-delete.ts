import { isNull, type SQL } from 'drizzle-orm'
import { timestamp, type PgColumn } from 'drizzle-orm/pg-core'

/**
 * Soft-delete convention for every table (jobs, applications and notes
 * shouldn't be silently unrecoverable — see README > Soft delete). Spread
 * this into a `pgTable(...)` definition rather than repeating the column by
 * hand, and use `notDeleted`/`isNotDeleted` below instead of writing an
 * ad hoc `deletedAt` filter per call site — one shared place for every
 * entity to stay consistent, mirroring how `isDemoMode()`/`audit()` already
 * centralize other cross-cutting concerns in this codebase.
 */
export const softDeleteColumns = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}

/**
 * DB-mode query filter — pass the table's `deletedAt` column. Compose with
 * `and()` alongside other conditions (see `src/data/recruiting.ts`'s
 * `getJob`/`deleteJob`/`updateJob`).
 */
export function notDeleted(column: PgColumn): SQL {
  return isNull(column)
}

/** Demo-mode (in-memory) predicate mirroring `notDeleted`, for `.filter()`. */
export function isNotDeleted<T extends { deletedAt: Date | null }>(row: T): boolean {
  return row.deletedAt === null
}
