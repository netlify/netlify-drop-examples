import type { EditMap } from '../edits-core'
import { getSettings, getUser, handleAuthCallback, login, logout } from '@netlify/identity'
import { configs } from '@slidev/client/env.ts'
import { lockShortcuts } from '@slidev/client/state/index.ts'
import { ref } from 'vue'
import { makeKey } from '../edits-core'

// Text edits laid over the slides. Only DOM text nodes are touched, so layout,
// classes and images can't change, and stored text is never rendered as HTML.

// Each deck is served under its own base path (/<slug>/); edits are stored per deck.
export const deckSlug = import.meta.env.BASE_URL.replace(/^\/|\/$/g, '') || 'default'
const editsUrl = `/api/edits?deck=${encodeURIComponent(deckSlug)}`

const EDIT_ROLES = ['editor', 'admin']
const SKIP = 'pre, code, iframe, script, style, textarea, [contenteditable="false"]'

export const edits = ref<EditMap>({})
export const identityEnabled = ref(false)
export const canEdit = ref(false)
export const userEmail = ref('')
export const editing = ref(false)
export const saving = ref(false)
export const editError = ref('')
export const loginOpen = ref(false)

interface Tracked { original: string, key: string }
const tracked = new WeakMap<Text, Tracked>()
let started = false
let baseline = new Map<Text, string>()
let unlock: (() => void) | undefined
let editRoot: HTMLElement | undefined

function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text
    if (text.nodeValue?.trim() && !text.parentElement?.closest(SKIP))
      nodes.push(text)
  }
  return nodes
}

/** Pairs each text node of a slide with its edit key, remembering original text. */
function keyed(root: HTMLElement): { node: Text, info: Tracked }[] {
  const slideNo = Number(root.dataset.slidevNo)
  const seen = new Map<string, number>()
  return textNodes(root).map((node) => {
    let info = tracked.get(node)
    if (!info) {
      const original = node.nodeValue!
      const base = makeKey(slideNo, original, 0).replace(/:0$/, '')
      const occurrence = seen.get(base) ?? 0
      info = { original, key: `${base}:${occurrence}` }
      tracked.set(node, info)
    }
    const base = info.key.replace(/:\d+$/, '')
    seen.set(base, (seen.get(base) ?? 0) + 1)
    return { node, info }
  })
}

function withOriginalSpacing(original: string, text: string) {
  const lead = original.match(/^\s*/)![0]
  const trail = original.match(/\s*$/)![0]
  return lead + text + trail
}

export function applyEdits() {
  if (editing.value)
    return
  document.querySelectorAll<HTMLElement>('[data-slidev-no]').forEach((root) => {
    for (const { node, info } of keyed(root)) {
      const text = edits.value[info.key]
      const next = text === undefined ? info.original : withOriginalSpacing(info.original, text)
      if (node.nodeValue !== next)
        node.nodeValue = next
    }
  })
}

async function fetchEdits() {
  try {
    const res = await fetch(editsUrl, { headers: { Accept: 'application/json' } })
    if (res.ok && res.headers.get('content-type')?.includes('json')) {
      edits.value = (await res.json()).edits ?? {}
      applyEdits()
    }
  }
  catch {}
}

async function refreshUser() {
  try {
    const user = await getUser()
    userEmail.value = user?.email ?? ''
    canEdit.value = !!user?.roles?.some(role => EDIT_ROLES.includes(role))
  }
  catch {
    userEmail.value = ''
    canEdit.value = false
  }
}

export async function initEdits(options: { identity?: boolean } = {}) {
  // Demo mode (`editing: false` in the slides.md headmatter): no edits, no Identity.
  if (started || (configs as Record<string, unknown>).editing !== true)
    return
  started = true

  let frame = 0
  new MutationObserver(() => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(applyEdits)
  }).observe(document.body, { childList: true, subtree: true })

  await fetchEdits()
  if (options.identity === false)
    return

  try {
    await getSettings() // throws MissingIdentityError when Identity is off
    identityEnabled.value = true
    await handleAuthCallback() // finishes invite / recovery / confirmation links
    await refreshUser()
  }
  catch {
    identityEnabled.value = false
  }
}

export async function logIn(email: string, password: string) {
  await login(email, password)
  await refreshUser()
  loginOpen.value = false
}

export async function logOut() {
  cancelEditing()
  await logout()
  await refreshUser()
}

function currentRoot(slideNo: number) {
  return document.querySelector<HTMLElement>(`#slide-content [data-slidev-no="${slideNo}"]`) ?? undefined
}

function editableValue() {
  const probe = document.createElement('div')
  probe.contentEditable = 'plaintext-only'
  return probe.contentEditable === 'plaintext-only' ? 'plaintext-only' : 'true'
}

function blockStructureChanges(event: InputEvent) {
  if (/^(insertParagraph|insertLineBreak|format|insertFromDrop|insertFromYank)/.test(event.inputType))
    event.preventDefault()
}

export function startEditing(slideNo: number) {
  const root = currentRoot(slideNo)
  if (!root || !canEdit.value)
    return
  editRoot = root
  baseline = new Map()
  for (const { node } of keyed(root)) {
    baseline.set(node, node.nodeValue!)
    node.parentElement!.setAttribute('contenteditable', editableValue())
  }
  root.addEventListener('beforeinput', blockStructureChanges as EventListener)
  root.classList.add('is-editing')
  unlock = lockShortcuts()
  editError.value = ''
  editing.value = true
}

function stopEditing() {
  editRoot?.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'))
  editRoot?.removeEventListener('beforeinput', blockStructureChanges as EventListener)
  editRoot?.classList.remove('is-editing')
  unlock?.()
  unlock = undefined
  editRoot = undefined
  editing.value = false
}

export function cancelEditing() {
  if (!editing.value)
    return
  for (const [node, value] of baseline) {
    if (node.isConnected)
      node.nodeValue = value
  }
  baseline = new Map()
  stopEditing()
}

async function send(body: { set: EditMap, reset: string[] }) {
  saving.value = true
  editError.value = ''
  try {
    const res = await fetch(editsUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok)
      throw new Error(data.error || `Save failed (${res.status})`)
    edits.value = data.edits
    return true
  }
  catch (error) {
    editError.value = error instanceof Error ? error.message : 'Save failed'
    return false
  }
  finally {
    saving.value = false
  }
}

export async function saveEditing() {
  const body: { set: EditMap, reset: string[] } = { set: {}, reset: [] }
  for (const [node, before] of baseline) {
    const info = tracked.get(node)
    if (!node.isConnected || !info || node.nodeValue === before)
      continue
    const text = node.nodeValue!.trim()
    if (text === info.original.trim())
      body.reset.push(info.key)
    else
      body.set[info.key] = text
  }
  if (!Object.keys(body.set).length && !body.reset.length) {
    baseline = new Map()
    stopEditing()
    return
  }
  if (await send(body)) {
    baseline = new Map()
    stopEditing()
    applyEdits()
  }
}

/** Drops every saved edit on the current slide. */
export async function resetSlide(slideNo: number) {
  const root = currentRoot(slideNo)
  if (!root)
    return
  const reset = keyed(root).map(({ info }) => info.key).filter(key => key in edits.value)
  if (!reset.length) {
    cancelEditing()
    return
  }
  cancelEditing()
  if (await send({ set: {}, reset }))
    applyEdits()
}
