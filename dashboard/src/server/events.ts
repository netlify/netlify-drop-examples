import { z } from 'zod'
import { isAuthEnabled } from '@/config/flags'
import { insertEvent } from '@/data/events'
import { getSessionUser } from '@/auth/server'
import type { Json } from '@/db/schema'

const trackEventInput = z.object({
  name: z.string().min(1),
  path: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Validates and persists a client-emitted tracking event. Called by
 * `netlify/functions/events.mts` (the `/api/events` endpoint) for beacons
 * sent by `lib/track-event.ts`'s client implementation. Server-originated
 * events (record_created, etc.) skip this and call `trackEvent()` directly.
 */
export async function trackEventServer(input: unknown) {
  const data = trackEventInput.parse(input)
  const user = isAuthEnabled() ? await getSessionUser() : null
  return insertEvent({
    name: data.name,
    path: data.path ?? null,
    actorId: user?.id ?? null,
    actorEmail: user?.email ?? null,
    props: (data.props as Json | undefined) ?? null,
  })
}
