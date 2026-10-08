// Shared by the edits and notes functions: one Blobs store, per-deck keys,
// editor-only writes and compare-and-set saves.
import type { Context } from '@netlify/functions'
import type { EditChange, EditMap } from '../../edits-core.ts'
import { getStore } from '@netlify/blobs'
import { getUser } from '@netlify/identity'
import { applyChange } from '../../edits-core.ts'

const EDIT_ROLES = ['editor', 'admin']
const DECK_RE = /^[a-z0-9][a-z0-9-]{0,63}$/
const MAX_ATTEMPTS = 4

export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

/** Site-wide stores are shared by every deploy context, so previews get their
 *  own store and can't touch production data. */
export function openStore(context: Context) {
  return getStore({
    name: context.deploy?.context === 'production' ? 'slide-edits' : 'slide-edits-preview',
    consistency: 'strong',
  })
}

/** The deck slug from `?deck=` (the deck's folder under the site root), or null if invalid. */
export function deckOf(req: Request): string | null {
  const deck = new URL(req.url).searchParams.get('deck') ?? 'default'
  return DECK_RE.test(deck) || deck === 'default' ? deck : null
}

/** A response if the caller isn't a logged-in editor, otherwise null. */
export async function rejectNonEditor(): Promise<Response | null> {
  const user = await getUser()
  if (!user)
    return json({ error: 'Log in to edit' }, 401)
  if (!user.roles?.some(role => EDIT_ROLES.includes(role)))
    return json({ error: 'Your account cannot edit' }, 403)
  return null
}

/** A response if the request didn't come from this site, otherwise null. */
export function rejectCrossOrigin(req: Request): Response | null {
  const origin = req.headers.get('origin')
  if (!origin || new URL(origin).host !== new URL(req.url).host)
    return json({ error: 'Cross-origin request blocked' }, 403)
  return null
}

/** Compare-and-set so two editors saving at once don't silently drop each other.
 *  Returns the saved map, or null if every attempt lost the race. */
export async function saveChange(store: ReturnType<typeof getStore>, key: string, change: EditChange): Promise<EditMap | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = await store.getWithMetadata(key, { type: 'json' })
    const next = applyChange((current?.data as EditMap | undefined) ?? {}, change)
    const result = await store.setJSON(
      key,
      next,
      current ? { onlyIfMatch: current.etag } : { onlyIfNew: true },
    )
    if (result.modified)
      return next
  }
  return null
}

export const conflict = () => json({ error: 'Someone else saved at the same time. Try again.' }, 409)
