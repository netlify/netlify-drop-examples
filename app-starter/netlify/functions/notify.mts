import type { Config } from '@netlify/functions'
import { notifySlack } from '../../src/lib/notify-channels/slack'
import { notifyEmail } from '../../src/lib/notify-channels/email'

/**
 * Background function backing `src/lib/notify.ts`. Runs fire-and-forget
 * (the caller gets an immediate response and doesn't wait on Slack/Resend).
 *
 * To add a channel: create `src/lib/notify-channels/<channel>.ts` exporting
 * a `notify<Channel>({ subject, body, to? })` function, then add one line
 * to the map below.
 */
const channels: Record<string, (input: { subject: string; body: string; to?: string }) => Promise<void>> = {
  slack: notifySlack,
  email: notifyEmail,
}

export default async (req: Request) => {
  const { channel, subject, body, to } = await req.json()

  const send = channels[channel]
  if (!send) {
    console.warn(`notify: unknown channel "${channel}"`)
    return
  }

  await send({ subject, body, to })
}

export const config: Config = {
  path: '/api/notify',
  background: true,
  method: 'POST',
}
