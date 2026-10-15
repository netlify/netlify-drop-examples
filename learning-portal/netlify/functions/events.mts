import type { Config } from '@netlify/functions'
import { trackEventServer } from '../../src/server/events'

/**
 * Receives the client-side tracking beacon sent by `src/lib/track-event.ts`
 * (via `navigator.sendBeacon`/`fetch`) and persists it through
 * `src/data/events.ts`.
 *
 * NOTE ON PLACEMENT: the original plan called for this to live at
 * `src/routes/api/events.ts` as a TanStack Start "server route". The
 * installed TanStack Start version (1.168) does not ship a file-based
 * server/API route convention (`createServerFileRoute` or similar doesn't
 * exist in this release) — only `createServerFn` (an RPC called from
 * TanStack code, not a plain URL a `sendBeacon` can target) and Netlify
 * Functions. A beacon needs a real URL, so this lives here as a Netlify
 * Function instead, exactly like notify/upload/files.
 */
export default async (req: Request) => {
  try {
    const body = await req.json()
    await trackEventServer(body)
    return new Response(null, { status: 204 })
  } catch {
    // Tracking must never break the app it's embedded in.
    return new Response(null, { status: 204 })
  }
}

export const config: Config = {
  path: '/api/events',
  method: 'POST',
}
