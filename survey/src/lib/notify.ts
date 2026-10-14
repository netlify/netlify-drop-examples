import { z } from 'zod'

const notifyInputSchema = z.object({
  channel: z.enum(['slack', 'email']),
  subject: z.string().min(1),
  body: z.string().min(1),
  to: z.string().email().optional(),
})

export type NotifyInput = z.infer<typeof notifyInputSchema>

function resolveBaseUrl() {
  if (typeof window !== 'undefined') return ''
  // Server-side callers need an absolute URL. Netlify sets URL/
  // DEPLOY_PRIME_URL at build+runtime; fall back to localhost for `vite dev`.
  return process.env.URL ?? process.env.DEPLOY_PRIME_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
}

/**
 * The one notification helper in the app: `notify({ channel: 'slack', subject, body })`.
 *
 * POSTs to `/api/notify`, a background Netlify Function (see
 * netlify/functions/notify.mts) that does the actual Slack/email send. This
 * keeps notification delivery off the request/response path — the caller
 * doesn't wait on a third-party API before its own response can return.
 */
export async function notify(input: NotifyInput): Promise<void> {
  const data = notifyInputSchema.parse(input)
  const baseUrl = resolveBaseUrl()

  await fetch(`${baseUrl}/api/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}
