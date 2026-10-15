import { useMemo, useState, useSyncExternalStore } from 'react'
import { Check, ChevronRight, X } from 'lucide-react'
import { Button } from 'app-packs-ui'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'go-live-checklist-dismissed'
const MANUAL_KEY = 'go-live-checklist-manual'
const IDENTITY_SETTINGS_URL = 'https://app.netlify.com/projects/~/identity'
const VISIBILITY_SETTINGS_URL = 'https://app.netlify.com/projects/~/configuration/general#project-visibility'

/**
 * One row of the Finish setting up card. Fields mirror the App Pack content
 * system: title, why, action, done when, required, learn more. Pack-specific
 * ("works with") rows would set `packSpecific` and list their keys in `action`.
 */
type ChecklistItem = {
  id: string
  title: string
  why: string
  // Paragraphs shown in order. A string is plain text; `{ prompt }` is an
  // "Ask your agent" prompt, rendered in quotes.
  action: Array<string | { prompt: string }>
  // A dashboard link, only when the app knows it can open one (deployed).
  link?: { label: string; href: string }
  // What makes the row done, as a phrase ("Identity is on"). Manual rows
  // say "Manual".
  doneWhen: string
  // `undefined` = the app cannot detect it, so it's manual: the admin ticks it.
  done?: boolean
  required: boolean
  // Template page anchor, e.g. `#before-you-share`.
  learnMore: string
}

const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function readStorage(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode, etc.) — fall through so the checklist
    // still updates for this page view.
  }
  listeners.forEach((listener) => listener())
}

const readDismissed = () => readStorage(DISMISS_KEY) === 'true'
const readManualRaw = () => readStorage(MANUAL_KEY)

function parseManual(raw: string): Set<string> {
  try {
    const parsed: unknown = JSON.parse(raw || '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [])
  } catch {
    return new Set()
  }
}

function setManualDone(id: string, done: boolean) {
  const ids = parseManual(readManualRaw())
  if (done) ids.add(id)
  else ids.delete(id)
  writeStorage(MANUAL_KEY, JSON.stringify([...ids]))
}

/**
 * Admin-only Finish setting up card (see `SetupPrompt`). Hides itself once
 * every required row is done; rows the app can't detect are ticked by hand
 * and never block it. The X dismisses it for good via localStorage.
 */
export function GoLiveChecklist() {
  const { authEnabled, deployed, user } = useAppContext()
  // The server snapshot is `true` so the checklist never flashes during SSR
  // or hydration for someone who already dismissed it.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true)
  const manualRaw = useSyncExternalStore(subscribe, readManualRaw, () => '')
  const manualDone = useMemo(() => parseManual(manualRaw), [manualRaw])
  const [dismissedForNow, setDismissedForNow] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const isAdmin = !!user?.roles.includes(appConfig.adminRole)
  const identityLink = deployed ? { label: 'Open Identity settings', href: IDENTITY_SETTINGS_URL } : undefined

  const rows: Array<ChecklistItem> = [
    {
      id: 'visibility',
      title: 'Check who can open your app',
      why: 'Decide whether only your Netlify team, or anyone with the link, can load the app.',
      action: ['Netlify dashboard: Project configuration, General, Visitor access, Project visibility.'],
      link: deployed ? { label: 'Open project visibility', href: VISIBILITY_SETTINGS_URL } : undefined,
      doneWhen: 'Manual',
      required: false,
      learnMore: '#before-you-share',
    },
    {
      id: 'signin',
      title: 'Turn on app sign-in (Netlify Identity)',
      why: 'Require people to log in to the app. This is separate from project visibility.',
      action: ['Netlify dashboard: Identity, then enable it.'],
      link: identityLink,
      doneWhen: 'Identity is on',
      done: authEnabled,
      required: true,
      learnMore: '#before-you-share',
    },
    {
      id: 'admin',
      title: 'Make yourself the admin',
      why: 'The first person to sign up becomes the admin.',
      action: ['Sign up at /login before you share the link.'],
      link: identityLink,
      doneWhen: 'Identity is on and you hold the admin role',
      done: authEnabled && isAdmin,
      required: true,
      learnMore: '#before-you-share',
    },
    {
      id: 'domain',
      title: 'Choose who can sign up',
      why: 'Limit signups to one email domain, or invite people yourself.',
      action: [
        { prompt: 'Only allow people with an @acme.com email to sign up.' },
        'Or turn off open signups in Identity settings and invite people from the Identity tab.',
      ],
      link: identityLink,
      doneWhen: 'Manual',
      required: false,
      learnMore: '#before-you-share',
    },
  ]
  // Manual rows have no `done` of their own; the admin's tick decides.
  const items = rows.map((item) => ({
    ...item,
    manual: item.done === undefined,
    done: item.done ?? manualDone.has(item.id),
  }))

  const requiredDone = items.filter((item) => item.required).every((item) => item.done)
  if (dismissed || dismissedForNow || requiredDone) return null

  const openItem = items.find((item) => item.id === openId) ?? null

  return (
    <>
      <aside
        aria-label="Setup checklist"
        className="fixed right-4 bottom-4 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-card p-3 text-card-foreground shadow-lg"
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Finish setting up</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss setup checklist"
            onClick={() => {
              setDismissedForNow(true)
              writeStorage(DISMISS_KEY, 'true')
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenId(item.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full border',
                    item.done && 'border-primary bg-primary text-primary-foreground',
                  )}
                  aria-hidden="true"
                >
                  {item.done ? <Check className="size-3" /> : null}
                </span>
                <span className={cn('flex-1', item.done && 'text-muted-foreground line-through')}>
                  {item.title}
                </span>
                {item.required ? null : <span className="text-xs text-muted-foreground">Optional</span>}
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <Dialog open={openItem !== null} onOpenChange={(open) => !open && setOpenId(null)}>
        {openItem ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{openItem.title}</DialogTitle>
              <DialogDescription>{openItem.why}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm text-muted-foreground">
              {openItem.action.map((part) =>
                typeof part === 'string' ? (
                  <p key={part}>{part}</p>
                ) : (
                  <p key={part.prompt}>
                    Ask your agent: <span className="text-foreground">&ldquo;{part.prompt}&rdquo;</span>
                  </p>
                ),
              )}
              <p>Done when: {openItem.manual ? 'you tick it off yourself.' : `${openItem.doneWhen}.`}</p>
              <p>
                <a
                  href={`${appConfig.templatePageUrl}${openItem.learnMore}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Learn more
                </a>
              </p>
            </div>
            <DialogFooter showCloseButton>
              {openItem.manual ? (
                <Button variant="outline" onClick={() => setManualDone(openItem.id, !openItem.done)}>
                  {openItem.done ? 'Mark as not done' : "I've done this"}
                </Button>
              ) : null}
              {openItem.link ? (
                <Button asChild>
                  <a href={openItem.link.href} target="_blank" rel="noreferrer">
                    {openItem.link.label}
                  </a>
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}
