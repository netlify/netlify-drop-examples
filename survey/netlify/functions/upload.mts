import { randomUUID } from 'node:crypto'
import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { getUser } from '@netlify/identity'
import { isAuthEnabled } from '../../src/config/flags'
import { checkRole } from '../../src/auth/session'
import { appConfig } from '../../src/config/app'

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // 4 MB — Netlify Functions request body limit.

export default async (req: Request) => {
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

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: 'Invalid multipart form data.' }, { status: 400 })
  }
  const file = form.get('file')

  if (!(file instanceof File)) {
    return Response.json({ error: 'No file provided (expected multipart field "file").' }, { status: 400 })
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: 'File exceeds the 4 MB upload limit.' }, { status: 413 })
  }

  const user = await getUser()
  const key = `${randomUUID()}-${file.name}`

  const store = getStore('uploads')
  await store.set(key, file, {
    metadata: {
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedBy: user?.email ?? 'demo',
    },
  })

  return Response.json({ key, url: `/api/files/${encodeURIComponent(key)}` })
}

export const config: Config = {
  path: '/api/upload',
  method: 'POST',
}
