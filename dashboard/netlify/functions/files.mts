import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { isAuthEnabled } from '../../src/config/flags'
import { checkRole } from '../../src/auth/session'
import { appConfig } from '../../src/config/app'

export default async (req: Request, context: Context) => {
  // These endpoints touch real Netlify Blobs storage, so they fail closed
  // rather than falling back to demo-mode-style "auth off means open"
  // behavior — see README > Uploads.
  if (!(await isAuthEnabled())) {
    return Response.json({ error: 'not_configured' }, { status: 403 })
  }

  if (appConfig.uploadAllowedRoles.length === 0) {
    return Response.json({ error: 'not_configured' }, { status: 403 })
  }

  const denied = await checkRole(appConfig.uploadAllowedRoles)
  if (denied) return denied

  const key = context.params.key
  if (!key) {
    return new Response('Not found', { status: 404 })
  }

  const store = getStore('uploads')
  const result = await store.getWithMetadata(key, { type: 'stream' })

  if (!result) {
    return new Response('Not found', { status: 404 })
  }

  const contentType = (result.metadata?.type as string | undefined) ?? 'application/octet-stream'

  return new Response(result.data, {
    headers: { 'Content-Type': contentType },
  })
}

export const config: Config = {
  path: '/api/files/:key',
  method: 'GET',
}
