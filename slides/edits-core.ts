// Shared by the browser (global-top.vue, edits.ts, notes.ts) and netlify/functions/edits.mts and notes.mts.
// Edits are a map of `key -> replacement text` laid over the rendered slides.
// A key is `<slide no>:<hash of the original text>:<occurrence>`, so it survives
// reordering and new slides; if the source text changes, the override stops matching.

export type EditMap = Record<string, string>
export interface EditChange {
  set: EditMap
  reset: string[]
}

export const MAX_VALUE_LENGTH = 2000
export const MAX_CHANGES = 200
export const MAX_NOTE_LENGTH = 5000
const KEY_RE = /^\d{1,4}:[0-9a-f]{8}:\d{1,3}$/
const NOTE_KEY_RE = /^\d{1,4}:[0-9a-f]{8}$/

export function hashText(text: string): string {
  // FNV-1a, 32 bit
  let h = 0x811C9DC5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function makeKey(slideNo: number, original: string, occurrence: number): string {
  return `${slideNo}:${hashText(original.trim())}:${occurrence}`
}

/** Notes are keyed by slide number plus a hash of the slide's title. */
export function makeNoteKey(slideNo: number, title: string): string {
  return `${slideNo}:${hashText(title.trim())}`
}

export function isValidNoteKey(key: unknown): key is string {
  return typeof key === 'string' && NOTE_KEY_RE.test(key)
}

export function isValidKey(key: unknown): key is string {
  return typeof key === 'string' && KEY_RE.test(key)
}

function parseKeyedChange(body: unknown, isKey: (key: unknown) => boolean, maxLength: number): EditChange | null {
  if (!body || typeof body !== 'object')
    return null
  const { set = {}, reset = [] } = body as { set?: unknown, reset?: unknown }
  if (!set || typeof set !== 'object' || Array.isArray(set) || !Array.isArray(reset))
    return null
  const entries = Object.entries(set as Record<string, unknown>)
  if (entries.length + reset.length > MAX_CHANGES)
    return null
  const clean: EditChange = { set: {}, reset: [] }
  for (const [key, value] of entries) {
    if (!isKey(key) || typeof value !== 'string' || value.length > maxLength)
      return null
    clean.set[key] = value
  }
  for (const key of reset) {
    if (!isKey(key))
      return null
    clean.reset.push(key as string)
  }
  return clean
}

/** Returns a clean change, or null if the body is malformed. */
export const parseChange = (body: unknown) => parseKeyedChange(body, isValidKey, MAX_VALUE_LENGTH)
export const parseNoteChange = (body: unknown) => parseKeyedChange(body, isValidNoteKey, MAX_NOTE_LENGTH)

export function applyChange(map: EditMap, change: EditChange): EditMap {
  const next: EditMap = { ...map, ...change.set }
  for (const key of change.reset)
    delete next[key]
  return next
}
