import { createIsomorphicFn } from '@tanstack/react-start'
import { isAuthEnabled } from '@/config/flags'
import { insertEvent } from '@/data/events'
import { getSessionUser } from '@/auth/server'
import type { Json } from '@/db/schema'

/**
 * The one tracking helper in the app. Same call signature everywhere:
 * `trackEvent('survey_created', { id })`.
 *
 * `createIsomorphicFn` compiles to two different implementations — the
 * `.server()` half writes directly to `data/events.ts` (used by server
 * functions in `src/server/*.ts` after a mutation), the `.client()` half
 * beacons to the `/api/events` route (used by `__root.tsx` for page views).
 * The compiler strips whichever half doesn't apply from each bundle, so
 * server-only imports (auth, the data layer) never reach the browser.
 */
export const trackEvent = createIsomorphicFn()
  .server(async (name: string, props?: Record<string, unknown>) => {
    const user = (await isAuthEnabled()) ? await getSessionUser() : null
    await insertEvent({
      name,
      path: null,
      actorId: user?.id ?? null,
      actorEmail: user?.email ?? null,
      props: (props as Json | undefined) ?? null,
    })
  })
  .client((name: string, props?: Record<string, unknown>) => {
    const path = window.location.pathname
    const payload = JSON.stringify({ name, path, props })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }))
    } else {
      void fetch('/api/events', {
        method: 'POST',
        body: payload,
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  })
