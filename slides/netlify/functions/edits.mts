import type { Config, Context } from '@netlify/functions'
import type { EditMap } from '../../edits-core.ts'
import { parseChange } from '../../edits-core.ts'
import { conflict, deckOf, json, openStore, rejectCrossOrigin, rejectNonEditor, saveChange } from '../lib/store.mts'

export default async (req: Request, context: Context) => {
  const store = openStore(context)

  // Edits are kept per deck: ?deck=<slug> (the deck's folder under the site root).
  const deck = deckOf(req)
  if (!deck)
    return json({ error: 'Invalid deck' }, 400)
  const BLOB_KEY = `edits/${deck}`

  if (req.method === 'GET') {
    const edits = (await store.get(BLOB_KEY, { type: 'json' })) as EditMap | null
    return json({ edits: edits ?? {} })
  }

  if (req.method !== 'PUT')
    return json({ error: 'Method not allowed' }, 405)

  const rejected = rejectCrossOrigin(req) ?? await rejectNonEditor()
  if (rejected)
    return rejected

  const change = parseChange(await req.json().catch(() => null))
  if (!change)
    return json({ error: 'Invalid edit' }, 400)

  const edits = await saveChange(store, BLOB_KEY, change)
  return edits ? json({ edits }) : conflict()
}

export const config: Config = { path: '/api/edits' }
