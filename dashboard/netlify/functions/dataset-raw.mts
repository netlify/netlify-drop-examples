import type { Config, Context } from '@netlify/functions'
import { isAuthEnabled } from '../../src/config/flags'
import { appConfig } from '../../src/config/app'
import { checkRole, getSessionUser } from '../../src/auth/session'
import { auditFromFunction } from '../../src/auth/function-audit'
import { resolveDbRole } from '../../src/db/rls'
import { getBatch } from '../../src/data/datasets'
import { getRawDataset } from '../../src/lib/dataset-blobs'

/**
 * GET /api/datasets/:batchId/raw — streams the originally uploaded CSV
 * (decrypted) back to an editor/admin and audits the download. Fail-closed
 * like the upload endpoints.
 */
export default async (_req: Request, context: Context) => {
  if (!(await isAuthEnabled())) return Response.json({ error: 'not_configured' }, { status: 403 })
  const denied = await checkRole(appConfig.dataEditorRoles)
  if (denied) return denied

  const user = (await getSessionUser())!
  const batchId = context.params.batchId
  const batch = batchId ? await getBatch(batchId, resolveDbRole(user.roles)!) : undefined
  if (!batch?.blobKey) return Response.json({ error: 'No raw file for this batch.' }, { status: 404 })

  const raw = await getRawDataset(batch.blobKey)
  if (!raw) return Response.json({ error: 'No raw file for this batch.' }, { status: 404 })

  await auditFromFunction('dataset.raw_downloaded', 'dataset_batch', batch.id, null, {
    dataset: batch.dataset,
    rowCount: batch.rowCount,
  })
  return new Response(new Uint8Array(raw), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${batch.dataset}-${batch.id}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

export const config: Config = {
  path: '/api/datasets/:batchId/raw',
  method: 'GET',
}
