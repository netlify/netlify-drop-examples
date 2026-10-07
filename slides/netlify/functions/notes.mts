import type { Config, Context } from '@netlify/functions'
import type { EditMap } from '../../edits-core.ts'
import { parseNoteChange } from '../../edits-core.ts'
import { conflict, deckOf, json, openStore, rejectCrossOrigin, rejectNonEditor, saveChange } from '../lib/store.mts'

// Speaker notes, kept per deck next to the text edits. Unlike edits, notes are
// private: only logged-in editors can read them as well as write them.
export default async (req: Request, context: Context) => {
  const deck = deckOf(req)
  if (!deck)
    return json({ error: 'Invalid deck' }, 400)
  const BLOB_KEY = `notes/${deck}`

  if (req.method === 'GET') {
    const rejected = await rejectNonEditor()
    if (rejected)
      return rejected
    const notes = (await openStore(context).get(BLOB_KEY, { type: 'json' })) as EditMap | null
    return json({ notes: notes ?? {} })
  }

  if (req.method !== 'PUT')
    return json({ error: 'Method not allowed' }, 405)

  const rejected = rejectCrossOrigin(req) ?? await rejectNonEditor()
  if (rejected)
    return rejected

  const change = parseNoteChange(await req.json().catch(() => null))
  if (!change)
    return json({ error: 'Invalid note' }, 400)

  const notes = await saveChange(openStore(context), BLOB_KEY, change)
  return notes ? json({ notes }) : conflict()
}

export const config: Config = { path: '/api/notes' }
