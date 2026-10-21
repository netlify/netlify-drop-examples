import { createHash } from 'node:crypto'
import { getStore } from '@netlify/blobs'
import { getRequestHeader, getRequestIP } from '@tanstack/react-start/server'
import { appConfig } from '../config/app'

export type DemoLimitReason = 'visitor' | 'daily'

/**
 * Counts one message against the demo caps in `appConfig.demoLimits`, or
 * returns which cap is already used up. Server-only; call it after the
 * request is validated so rejected requests don't count.
 *
 * Counters live in Netlify Blobs, keyed by UTC day. Visitors are a hash of
 * IP + day, so no raw IPs are stored. Blobs has no atomic increment, so a
 * burst of parallel requests can overshoot by a message or two. Fails
 * closed: if Blobs is unreachable the demo stops answering rather than
 * running without caps.
 */
export async function reserveDemoMessage(): Promise<DemoLimitReason | null> {
  const { messagesPerVisitor, messagesPerDay } = appConfig.demoLimits
  const day = new Date().toISOString().slice(0, 10)
  // Netlify sets x-nf-client-connection-ip to the real client address.
  const ip =
    getRequestHeader('x-nf-client-connection-ip') ??
    getRequestIP({ xForwardedFor: true }) ??
    'unknown'
  const visitor = createHash('sha256').update(`${day}:${ip}`).digest('hex').slice(0, 32)
  const totalKey = `${day}/total`
  const visitorKey = `${day}/visitors/${visitor}`

  try {
    const store = getStore({ name: 'demo-usage', consistency: 'strong' })
    const [total, used] = await Promise.all([
      store.get(totalKey, { type: 'json' }) as Promise<number | null>,
      store.get(visitorKey, { type: 'json' }) as Promise<number | null>,
    ])
    if ((used ?? 0) >= messagesPerVisitor) return 'visitor'
    if ((total ?? 0) >= messagesPerDay) return 'daily'
    await Promise.all([
      store.setJSON(totalKey, (total ?? 0) + 1),
      store.setJSON(visitorKey, (used ?? 0) + 1),
    ])
    return null
  } catch (error) {
    console.error('Demo usage check failed; refusing the message.', error)
    return 'daily'
  }
}
