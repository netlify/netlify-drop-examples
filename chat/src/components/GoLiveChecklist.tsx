import { useMemo, useState, useSyncExternalStore } from 'react'
import { Check, ChevronDown, ChevronRight, ListChecks, X } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from 'app-packs-ui'
import { appConfig } from '../config/app'
import { useAppContext } from '../server/context'
import { ENV_SETTINGS_URL, VISIBILITY_SETTINGS_URL } from '../lib/dashboard-links'
import { Modal } from './Modal'

const DISMISS_KEY = 'go-live-checklist-dismissed'
const MANUAL_KEY = 'go-live-checklist-manual'

/**
 * One row of the Finish setting up card. Fields mirror the App Pack content
 * system: title, why, action, done when, required, learn more.
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
  // What makes the row done, as a phrase ("A model is connected"). Manual
  // rows say "Manual".
  doneWhen: string
  // `undefined` = the app cannot detect it, so it's manual: the user ticks it.
  done?: boolean
  required: boolean
  // README anchor, e.g. `#anthropic-api-key`.
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
 * Finish setting up card (see `SetupPrompt`). Hides itself once every
 * required row is done; rows the app can't detect are ticked by hand. The X
 * dismisses it for good via localStorage.
 */
export function GoLiveChecklist() {
  const { aiConfigured, deployed } = useAppContext()
  // The server snapshot is `true` so the checklist never flashes during SSR
  // or hydration for someone who already dismissed it.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true)
  const manualRaw = useSyncExternalStore(subscribe, readManualRaw, () => '')
  const manualDone = useMemo(() => parseManual(manualRaw), [manualRaw])
  const [dismissedForNow, setDismissedForNow] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  // Starts as a small pill at every size: an open card would cover the chat
  // composer's send button (the base template opens it from `sm` up).
  const [expanded, setExpanded] = useState(false)

  const envLink = deployed ? { label: 'Open environment variables', href: ENV_SETTINGS_URL } : undefined

  const rows: Array<ChecklistItem> = [
    {
      id: 'ai',
      title: 'Connect an AI model',
      why: 'The chat needs a model to answer. On Netlify, AI Gateway connects Claude for you, with no API key to manage.',
      action: deployed
        ? [
            'AI Gateway sets ANTHROPIC_API_KEY automatically. If this row is still open, redeploy the project.',
            'To bill your own Anthropic account instead, add ANTHROPIC_API_KEY to the environment variables.',
          ]
        : [
            'Run the app with `netlify dev` to use AI Gateway locally, or add ANTHROPIC_API_KEY to your .env file.',
          ],
      link: envLink,
      doneWhen: 'ANTHROPIC_API_KEY is available to the app',
      done: aiConfigured,
      required: true,
      learnMore: '#anthropic-api-key',
    },
    {
      id: 'visibility',
      title: 'Check who can open your app',
      why: 'Anyone who can load the app can chat with it, and every message uses your AI credits.',
      action: [
        'Netlify dashboard: Project configuration, General, Visitor access, Project visibility. Choose your Netlify team only, or anyone with the link.',
      ],
      link: deployed ? { label: 'Open project visibility', href: VISIBILITY_SETTINGS_URL } : undefined,
      doneWhen: 'Manual',
      required: true,
      learnMore: '#go-live-checklist',
    },
    {
      id: 'convex',
      title: 'Save conversations',
      why: 'Conversations only live in the open tab and are lost on reload until you connect a Convex database.',
      action: [
        'Set VITE_CONVEX_URL to your Convex deployment URL, then redeploy.',
        { prompt: 'Set up Convex so conversations are saved between visits.' },
      ],
      link: envLink,
      doneWhen: 'VITE_CONVEX_URL is set',
      done: !!import.meta.env.VITE_CONVEX_URL,
      required: false,
      learnMore: '#convex-configuration-optional',
    },
    {
      id: 'sentry',
      title: 'Track errors',
      why: 'See failed AI requests and crashes from real visitors in Sentry.',
      action: [
        'Set VITE_SENTRY_DSN (and SENTRY_AUTH_TOKEN for readable stack traces), then redeploy.',
      ],
      link: envLink,
      doneWhen: 'VITE_SENTRY_DSN is set',
      done: !!import.meta.env.VITE_SENTRY_DSN,
      required: false,
      learnMore: '#error-monitoring',
    },
  ]
  // Manual rows have no `done` of their own; the user's tick decides.
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
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className={
          // Sits above the docked chat composer so it never covers the send button.
          'fixed right-4 bottom-24 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-lg ' +
          (expanded ? 'hidden' : '')
        }
      >
        <ListChecks className="size-4" aria-hidden="true" />
        Finish setting up
        <span className="text-muted-foreground">
          {items.filter((item) => item.done).length}/{items.length}
        </span>
      </button>
      <aside
        aria-label="Setup checklist"
        className={
          'fixed right-4 bottom-24 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-3 text-foreground shadow-lg ' +
          (expanded ? '' : 'hidden')
        }
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Finish setting up</h2>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Minimize setup checklist"
              className="max-sm:size-10"
              onClick={() => setExpanded(false)}
            >
              <ChevronDown className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Dismiss setup checklist"
              className="max-sm:size-10"
              onClick={() => {
                setDismissedForNow(true)
                writeStorage(DISMISS_KEY, 'true')
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenId(item.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted max-sm:min-h-11"
              >
                <span
                  className={
                    'flex size-4 shrink-0 items-center justify-center rounded-full border border-border-strong ' +
                    (item.done ? 'border-accent bg-accent text-accent-foreground' : '')
                  }
                  aria-hidden="true"
                >
                  {item.done ? <Check className="size-3" /> : null}
                </span>
                <span className={'flex-1 ' + (item.done ? 'text-muted-foreground line-through' : '')}>
                  {item.title}
                  {item.done ? <span className="sr-only"> (done)</span> : null}
                </span>
                {item.required ? null : <span className="text-xs text-muted-foreground">Optional</span>}
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <Modal
        open={openItem !== null}
        onClose={() => setOpenId(null)}
        labelledBy="checklist-item-title"
        className="max-w-md"
      >
        {openItem ? (
          <Card className="shadow-xl">
            <CardHeader className="flex items-start justify-between gap-4">
              <div>
                <CardTitle id="checklist-item-title">{openItem.title}</CardTitle>
                <CardDescription>{openItem.why}</CardDescription>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => setOpenId(null)}>
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
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
                  href={`${appConfig.docsUrl}${openItem.learnMore}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Learn more
                </a>
              </p>
            </CardContent>
            {openItem.manual || openItem.link ? (
              <CardFooter variant="muted" className="flex-col justify-end gap-2 sm:flex-row">
                {openItem.manual ? (
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => setManualDone(openItem.id, !openItem.done)}
                  >
                    {openItem.done ? 'Mark as not done' : "I've done this"}
                  </Button>
                ) : null}
                {openItem.link ? (
                  <Button size="small" asChild className="max-sm:order-first">
                    <a href={openItem.link.href} target="_blank" rel="noreferrer">
                      {openItem.link.label}
                    </a>
                  </Button>
                ) : null}
              </CardFooter>
            ) : null}
          </Card>
        ) : null}
      </Modal>
    </>
  )
}
