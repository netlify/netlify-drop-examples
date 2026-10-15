import { useState, useSyncExternalStore } from 'react'
import { Check, ChevronRight, Copy, ExternalLink, X } from 'lucide-react'
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
const VISIBILITY_SETTINGS_URL = 'https://app.netlify.com/projects/~/configuration/general'
const IDENTITY_SETTINGS_URL = 'https://app.netlify.com/projects/~/identity'

/**
 * One row of the checklist. Follows the App Pack content system: every row
 * has a title, a one-sentence why, an action (dashboard path and/or an "Ask
 * your agent" prompt), a done check (or manual), whether it's required, and a
 * template page anchor for "Learn more".
 */
type ChecklistItem = {
  id: string
  title: string
  why: string
  action: {
    // Where to go in the Netlify dashboard, in words.
    text: string
    // Only linked on a real deploy; `/projects/~/…` needs a linked project.
    href?: string
    hrefLabel?: string
    // Something to paste into a coding agent, shown in quotes.
    prompts?: Array<string>
  }
  // `'manual'` = the app can't check it, so the admin ticks "I've done this".
  // Manual rows never block the card from hiding.
  done: boolean | 'manual'
  required: boolean
  learnMore: `#${string}`
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

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode, etc.) — the change still applies for
    // this page view.
  }
  listeners.forEach((listener) => listener())
}

function parseTicks(raw: string): Array<string> {
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

/**
 * Admin-only "Finish setting up" card (see `SetupPrompt`). Hides itself once
 * every required row is done, and the X dismisses it for good via
 * localStorage.
 */
export function GoLiveChecklist() {
  const { authEnabled, deployed, user } = useAppContext()
  // The server snapshot is "dismissed" so the card never flashes during SSR
  // or hydration for someone who already dismissed it.
  const dismissed =
    useSyncExternalStore(
      subscribe,
      () => read(DISMISS_KEY),
      () => 'true',
    ) === 'true'
  const ticked = parseTicks(
    useSyncExternalStore(
      subscribe,
      () => read(MANUAL_KEY),
      () => '',
    ),
  )
  const [dismissedForNow, setDismissedForNow] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const isAdmin = !!user?.roles.includes(appConfig.adminRole)
  const link = (href: string, hrefLabel: string) => (deployed ? { href, hrefLabel } : {})

  const items: Array<ChecklistItem> = [
    {
      id: 'visibility',
      title: 'Check who can open your app',
      why: 'Decide whether only your Netlify team, or anyone with the link, can load the app.',
      action: {
        text: 'Netlify dashboard: Project configuration, General, Visitor access, Project visibility.',
        ...link(VISIBILITY_SETTINGS_URL, 'Open project settings'),
      },
      done: 'manual',
      required: false,
      learnMore: '#before-you-share',
    },
    {
      id: 'signin',
      title: 'Turn on app sign-in (Netlify Identity)',
      why: 'Require people to log in to the app. This is separate from project visibility.',
      action: {
        text: 'Netlify dashboard: Identity, then enable it. First decide the default role for new signups.',
        ...link(IDENTITY_SETTINGS_URL, 'Open Identity settings'),
        prompts: ['Make the default role for new signups read-only.'],
      },
      done: authEnabled,
      required: true,
      learnMore: '#before-you-share',
    },
    {
      id: 'admin',
      title: 'Make yourself the admin',
      why: 'The first person to sign up becomes the admin.',
      action: { text: 'Sign up at /login before you share the link.' },
      done: authEnabled && isAdmin,
      required: true,
      learnMore: '#before-you-share',
    },
    {
      id: 'domain',
      title: 'Choose who can sign up',
      why: 'Limit signups to one email domain, or invite people yourself.',
      action: {
        text: 'Or turn off open signups in Identity settings and invite people from the Identity tab.',
        ...link(IDENTITY_SETTINGS_URL, 'Open Identity settings'),
        prompts: ['Only allow people with an @acme.com email to sign up.'],
      },
      done: 'manual',
      required: false,
      learnMore: '#before-you-share',
    },
  ]

  const isDone = (item: ChecklistItem) => (item.done === 'manual' ? ticked.includes(item.id) : item.done)
  const allRequiredDone = items.every((item) => !item.required || isDone(item))
  if (dismissed || dismissedForNow || allRequiredDone) return null

  const openItem = items.find((item) => item.id === openId) ?? null
  const toggleTick = (id: string) =>
    write(MANUAL_KEY, JSON.stringify(ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id]))

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
              write(DISMISS_KEY, 'true')
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
                    isDone(item) && 'border-primary bg-primary text-primary-foreground',
                  )}
                  aria-hidden="true"
                >
                  {isDone(item) ? <Check className="size-3" /> : null}
                </span>
                <span className={cn('flex-1', isDone(item) && 'text-muted-foreground line-through')}>
                  {item.title}
                  {item.required ? null : <span className="text-muted-foreground"> (optional)</span>}
                </span>
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
            <div className="space-y-3 text-sm text-muted-foreground">
              {openItem.action.prompts?.map((prompt) => (
                <AgentPrompt key={prompt} prompt={prompt} />
              ))}
              <p>{openItem.action.text}</p>
              <a
                href={`${appConfig.templatePageUrl}${openItem.learnMore}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Learn more
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
            <DialogFooter showCloseButton>
              {openItem.done === 'manual' ? (
                <Button variant="outline" onClick={() => toggleTick(openItem.id)}>
                  {ticked.includes(openItem.id) ? (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Done
                    </>
                  ) : (
                    "I've done this"
                  )}
                </Button>
              ) : null}
              {openItem.action.href ? (
                <Button asChild>
                  <a href={openItem.action.href} target="_blank" rel="noreferrer">
                    {openItem.action.hrefLabel}
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

function AgentPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="rounded-md border bg-muted/50 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Ask your agent</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Copy prompt"
          onClick={() => {
            void navigator.clipboard?.writeText(prompt).then(() => setCopied(true))
          }}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <p className="text-foreground">“{prompt}”</p>
    </div>
  )
}
