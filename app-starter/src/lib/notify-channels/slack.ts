/**
 * Sends a Slack message via an incoming webhook.
 * Requires `SLACK_WEBHOOK_URL` (Slack → your workspace → Apps → Incoming
 * Webhooks). Missing config is a warning, not an error — notify() should
 * never crash the app it's wired into.
 */
export async function notifySlack({ subject, body }: { subject: string; body: string }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    console.warn('notify: slack not configured — see README › Notifications')
    return
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `*${subject}*\n${body}` }),
  })
}
