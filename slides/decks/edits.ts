import type { AuthProvider, Settings } from '@netlify/identity'
import type { EditMap } from '../edits-core'
import { acceptInvite, getSettings, getUser, handleAuthCallback, login, logout, oauthLogin, requestPasswordRecovery, signup, updateUser } from '@netlify/identity'
import { lockShortcuts } from '@slidev/client/state/index.ts'
import { ref } from 'vue'
import { makeKey } from '../edits-core'

// Text edits laid over the slides. Only DOM text nodes are touched, so layout,
// classes and images can't change, and stored text is never rendered as HTML.

// Each deck is served under its own base path (/<slug>/); edits are stored per deck.
export const deckSlug = import.meta.env.BASE_URL.replace(/^\/|\/$/g, '') || 'default'
const editsUrl = `/api/edits?deck=${encodeURIComponent(deckSlug)}`

const SKIP = 'pre, code, iframe, script, style, textarea, [contenteditable="false"]'

export const edits = ref<EditMap>({})
export const identityEnabled = ref(false)
/** Anyone signed in can edit. */
export const canEdit = ref(false)
export const userEmail = ref('')
export const editing = ref(false)
export const saving = ref(false)
export const editError = ref('')
export const loginOpen = ref(false)

/** Screens of the login dialog. `invite` and `recovery` set a password after an email link. */
export type LoginMode = 'login' | 'signup' | 'forgot' | 'reset-sent' | 'check-email' | 'invite' | 'recovery'
export const loginMode = ref<LoginMode>('login')
/** A message carried into the dialog, such as a sign-in link that didn't work. */
export const loginNotice = ref('')
/** Identity's Registration and provider settings, which the dialog follows. */
export const identitySettings = ref<Settings | null>(null)
let inviteToken = ''

// Identity's email links and OAuth logins return to the site root, which is the static
// home page. It forwards the auth hash to the deck saved here (scripts/build-index.mjs).
const RETURN_KEY = 'slides-auth-return'
function rememberDeck() {
  try {
    localStorage.setItem(RETURN_KEY, import.meta.env.BASE_URL)
  }
  catch {}
}

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
    canEdit.value = !!user
  }
  catch {
    userEmail.value = ''
    canEdit.value = false
  }
}

export async function initEdits(options: { identity?: boolean } = {}) {
  if (started)
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
    identitySettings.value = await getSettings() // throws MissingIdentityError when Identity is off
    identityEnabled.value = true
  }
  catch {
    identityEnabled.value = false
    return
  }
  await finishAuthLink()
  await refreshUser()
}

export function openLogin(mode: LoginMode = 'login', notice = '') {
  loginMode.value = mode
  loginNotice.value = notice
  loginOpen.value = true
}

function clearHash() {
  history.replaceState(history.state, '', location.pathname + location.search)
}

/** Finishes an invite, password reset, confirmation or OAuth link that landed on this deck. */
async function finishAuthLink() {
  // A provider that refuses the login comes back with only an error in the hash.
  const refused = new URLSearchParams(location.hash.slice(1)).get('error_description')
  if (refused) {
    clearHash()
    openLogin('login', `We couldn't sign you in: ${refused}`)
    return
  }
  try {
    const result = await handleAuthCallback()
    if (result?.type === 'invite') {
      inviteToken = result.token ?? ''
      openLogin('invite')
    }
    else if (result?.type === 'recovery') {
      // The link signed the person in, but the password hasn't changed yet.
      openLogin('recovery')
    }
  }
  catch {
    // A token was there but didn't work: usually an expired or already-used link.
    clearHash()
    openLogin('login', "That link didn't work. It may have expired. Log in, or ask for a new one.")
  }
}

/** Checked in the dialog before any request is made, rather than the browser's `minlength`,
 *  which shows a native popup and can't carry our wording. Login doesn't check it: an existing
 *  account may predate the rule. */
export const MIN_PASSWORD_LENGTH = 8
export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`

const MAX_DETAIL_LENGTH = 200

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_DETAIL_LENGTH) : ''
}

/** Best available message and HTTP status for an auth error. `@netlify/identity` wraps the
 *  gotrue-js error, which often has an empty `message` (the status text is blank over HTTP/2)
 *  and keeps the useful parts on `status` and `json`, so this looks through `cause`. */
function describeAuthError(error: unknown): { message: string, status?: number } {
  let message = ''
  let status: number | undefined
  let current: unknown = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const e = current as { message?: unknown, status?: unknown, json?: Record<string, unknown> | null, cause?: unknown }
    if (status === undefined && typeof e.status === 'number')
      status = e.status
    // The server's own words win over the library's, which may just be the status text.
    message ||= asText(e.json?.msg) || asText(e.json?.message) || asText(e.json?.error_description) || asText(e.json?.error) || asText(e.message)
    current = e.cause
  }
  return { message, status }
}

/** Plain-language messages for the Identity failures people hit. Identity's wording isn't a
 *  stable contract, so this matches loosely and falls back to the original message. */
export function friendlyAuthError(error: unknown, mode: LoginMode): string {
  const { message, status } = describeAuthError(error)
  if (/not confirmed|confirm your email|unconfirmed/i.test(message))
    return 'Confirm your email first. Use the link we sent when you signed up.'
  if (/signups? (are |is )?(not allowed|disabled)|signup.*disabled/i.test(message))
    return 'Sign-up is by invitation only. Ask for an invite.'
  if (mode === 'signup' && /already (been )?registered|already exists|already in use/i.test(message))
    return 'An account with that email already exists. Log in instead.'
  if (mode === 'login' && /invalid (login )?credentials|invalid.*(email|password)|password invalid|no user found|incorrect/i.test(message))
    return 'Email or password is incorrect.'
  const networkFailure = /^(failed to fetch|load failed|networkerror)/i.test(message)
  if (message && !networkFailure)
    return message

  // No usable message: fall back on what the status and the dialog say.
  if (networkFailure)
    return 'We couldn\'t reach the sign-in service. Check your connection and try again.'
  if (!status)
    return 'Something went wrong. Try again.'
  if (status === 429)
    return 'Too many attempts. Wait a minute and try again.'
  if (mode === 'signup' && (status === 400 || status === 403 || status === 422))
    return `Sign-up was refused (error ${status}). This site may only allow certain email domains, or sign-up by invitation. Ask for an invite.`
  if (status >= 500) {
    return mode === 'signup'
      ? `Sign-up failed on the server (error ${status}). Try again in a moment. If it keeps happening, the site owner should check the Identity function's logs.`
      : `The sign-in service had a problem (error ${status}). Try again in a moment.`
  }
  return `Something went wrong (error ${status}). Try again.`
}

export async function logIn(email: string, password: string) {
  await login(email, password)
  await refreshUser()
  loginOpen.value = false
}

/** Signs up. With email confirmation on, Identity sends a link and there is no session yet. */
export async function signUp(email: string, password: string) {
  rememberDeck()
  const user = await signup(email, password)
  if (!user.confirmedAt) {
    loginMode.value = 'check-email'
    return
  }
  await refreshUser()
  loginOpen.value = false
}

export async function sendPasswordReset(email: string) {
  rememberDeck()
  await requestPasswordRecovery(email)
  loginMode.value = 'reset-sent'
}

export function logInWith(provider: AuthProvider) {
  rememberDeck()
  try {
    oauthLogin(provider) // navigates away, then throws to stop the caller
  }
  catch {}
}

/** Sets the password after an invite or password reset link. */
export async function setPassword(password: string) {
  if (loginMode.value === 'invite')
    await acceptInvite(inviteToken, password)
  else
    await updateUser({ password })
  inviteToken = ''
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
