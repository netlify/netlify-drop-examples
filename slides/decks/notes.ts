import type { SlideRoute } from '@slidev/types'
import type { EditMap } from '../edits-core'
import { useLocalStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { makeNoteKey } from '../edits-core'
import { canEdit, deckSlug, identityEnabled } from './edits'

// Private slide notes, stored per deck in Netlify Blobs next to the text edits
// (netlify/functions/notes.mts). Only logged-in editors can read or write them.
// A note is keyed by slide number plus a hash of the slide's title (or, for slides
// built from raw HTML with no heading, the start of its text), so notes follow a
// slide when slides are added or reordered.

const notesUrl = `/api/notes?deck=${encodeURIComponent(deckSlug)}`

export const notes = ref<EditMap>({})
export const notesOpen = useLocalStorage('deck-notes-open', false)
export const notesSaving = ref(false)
export const notesError = ref('')

/** The pane is only offered to logged-in editors on decks with editing turned on. */
export const notesAvailable = computed(() => identityEnabled.value && canEdit.value)

/** What identifies a slide besides its number: its title, else its first words of text. */
export function slideLabel(route?: SlideRoute): string {
  const slide = route?.meta?.slide
  if (slide?.title)
    return slide.title
  return (slide?.content ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export interface SlideNote {
  key: string
  text: string
  /** The saved note was written under an earlier title of this slide. */
  orphan: boolean
  /** Key the text is stored under now, to drop when it is re-saved under `key`. */
  staleKey?: string
}

export function noteFor(slideNo: number, label: string): SlideNote {
  const key = makeNoteKey(slideNo, label)
  const keys = Object.keys(notes.value)
  if (key in notes.value)
    return { key, text: notes.value[key], orphan: false }
  // Same title at another position: the slide was moved, so the note follows it.
  const hash = key.split(':')[1]
  const moved = keys.filter(k => k.endsWith(`:${hash}`))
  if (moved.length === 1)
    return { key, text: notes.value[moved[0]], orphan: false, staleKey: moved[0] }
  // Same position, different title: show the old note and let the user re-attach it.
  const staleKey = keys.find(k => k.startsWith(`${slideNo}:`))
  if (staleKey)
    return { key, text: notes.value[staleKey], orphan: true, staleKey }
  return { key, text: '', orphan: false }
}

async function fetchNotes() {
  try {
    const res = await fetch(notesUrl, { headers: { Accept: 'application/json' } })
    if (res.ok && res.headers.get('content-type')?.includes('json'))
      notes.value = (await res.json()).notes ?? {}
  }
  catch {}
}

watch(notesAvailable, (on) => {
  if (on)
    fetchNotes()
  else
    notes.value = {}
}, { immediate: true })

/** Saves the note for a slide; empty text deletes it. Returns false on failure. */
export async function saveNote(note: SlideNote, text: string) {
  const value = text.trim()
  const body: { set: EditMap, reset: string[] } = { set: {}, reset: [] }
  if (value)
    body.set[note.key] = value
  else if (note.key in notes.value)
    body.reset.push(note.key)
  if (note.staleKey)
    body.reset.push(note.staleKey)
  if (!Object.keys(body.set).length && !body.reset.length)
    return true

  notesSaving.value = true
  notesError.value = ''
  try {
    const res = await fetch(notesUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok)
      throw new Error(data.error || `Save failed (${res.status})`)
    notes.value = data.notes
    return true
  }
  catch (error) {
    notesError.value = error instanceof Error ? error.message : 'Save failed'
    return false
  }
  finally {
    notesSaving.value = false
  }
}
