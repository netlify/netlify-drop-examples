/**
 * Sends an email via Resend (https://resend.com). Requires
 * `RESEND_API_KEY` and `NOTIFY_EMAIL_FROM`; `to` falls back to
 * `NOTIFY_EMAIL_TO` when the caller doesn't supply one. Missing config is a
 * warning, not an error — notify() should never crash the app it's wired
 * into.
 *
 * To add another channel, add a file here (e.g. `sms.ts`) and register it
 * in `netlify/functions/notify.mts`'s channel map.
 */
export async function notifyEmail({ subject, body, to }: { subject: string; body: string; to?: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.NOTIFY_EMAIL_FROM
  const recipient = to ?? process.env.NOTIFY_EMAIL_TO

  if (!apiKey || !from || !recipient) {
    console.warn('notify: email not configured — see README › Notifications')
    return
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: recipient, subject, html: body }),
  })
}
