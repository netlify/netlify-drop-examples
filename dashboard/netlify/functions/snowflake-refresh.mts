import type { Config } from '@netlify/functions'
import { isAuthEnabled, getSnowflakeConfig } from '../../src/config/flags'
import { appConfig } from '../../src/config/app'
import { checkRole, getSessionUser } from '../../src/auth/session'
import { auditFromFunction } from '../../src/auth/function-audit'
import { resolveDbRole } from '../../src/db/rls'
import { ingestBatch } from '../../src/data/datasets'
import { createSnowflakeAdapter } from '../../src/datasets/adapters/snowflake'
import { DatasetValidationError } from '../../src/datasets/contract'
import { isSavedQueryId, savedQueries } from '../../src/config/saved-queries'

/**
 * POST /api/datasets/refresh  body: { queryId, params }
 *
 * Manual refresh from Snowflake. Credentials never leave this function. The
 * client can only name a saved query from the server-side allowlist
 * (src/config/saved-queries.ts) and supply params that pass its zod schema.
 * Fail-closed like the upload endpoints: no Identity -> 403.
 */
export default async (req: Request) => {
  if (!isAuthEnabled()) return Response.json({ error: 'not_configured' }, { status: 403 })
  const denied = await checkRole(appConfig.dataEditorRoles)
  if (denied) return denied

  const snowflake = getSnowflakeConfig()
  if (!snowflake) return Response.json({ error: 'snowflake_not_configured' }, { status: 409 })

  const body = (await req.json().catch(() => null)) as { queryId?: unknown; params?: unknown } | null
  if (!body || typeof body.queryId !== 'string' || !isSavedQueryId(body.queryId)) {
    return Response.json({ error: 'Unknown queryId' }, { status: 400 })
  }
  const saved = savedQueries[body.queryId]
  const parsedParams = saved.params.safeParse(body.params ?? {})
  if (!parsedParams.success) {
    return Response.json({ error: 'Invalid params', issues: parsedParams.error.issues }, { status: 400 })
  }

  const user = (await getSessionUser())!
  const role = resolveDbRole(user.roles)!
  try {
    const rows = await createSnowflakeAdapter(snowflake).getDataset(saved.dataset, {
      savedQueryId: body.queryId,
      params: parsedParams.data,
    })
    const { batch, previous } = await ingestBatch(saved.dataset, rows, {
      source: 'snowflake',
      actor: { id: user.id, email: user.email },
      role,
    })
    const meta = (b: typeof batch | null) =>
      b ? { dataset: b.dataset, rowCount: b.rowCount, source: b.source } : null
    await auditFromFunction('dataset.refreshed', 'dataset_batch', batch.id, meta(previous), meta(batch))
    return Response.json({ ok: true, batchId: batch.id, rowCount: batch.rowCount })
  } catch (err) {
    if (err instanceof DatasetValidationError) {
      return Response.json(
        { ok: false, row: err.row, column: err.column, message: err.message },
        { status: 422 },
      )
    }
    console.error('Snowflake refresh failed:', err instanceof Error ? err.message : err)
    return Response.json(
      { ok: false, message: 'Snowflake refresh failed. Check the function logs.' },
      { status: 502 },
    )
  }
}

export const config: Config = {
  path: '/api/datasets/refresh',
  method: 'POST',
}
