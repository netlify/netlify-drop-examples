import { useState, useSyncExternalStore } from 'react'
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
const IDENTITY_SETTINGS_URL = 'https://app.netlify.com/projects/~/identity'

type ChecklistItem = {
  id: string
  title: string
  summary: string
  steps: Array<string>
  // `undefined` = nothing the app can verify, so it never counts toward
  // "everything is done".
  done?: boolean
  action?: { label: string; href: string }
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

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === 'true'
  } catch {
    return false
  }
}

function dismiss() {
  try {
    window.localStorage.setItem(DISMISS_KEY, 'true')
  } catch {
    // Storage blocked (private mode, etc.) — fall through so the checklist
    // still closes for this page view.
  }
  listeners.forEach((listener) => listener())
}

/**
 * Admin-only setup checklist (see `SetupPrompt`). Hides itself once every
 * checkable row is done, and stays dismissed across reloads via localStorage.
 */
export function GoLiveChecklist() {
  const { authEnabled, deployed, user } = useAppContext()
  // The server snapshot is `true` so the checklist never flashes during SSR
  // or hydration for someone who already dismissed it.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true)
  const [dismissedForNow, setDismissedForNow] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const isAdmin = !!user?.roles.includes(appConfig.adminRole)
  const identityAction = deployed
    ? { label: 'Open Identity settings', href: IDENTITY_SETTINGS_URL }
    : undefined

  const items: Array<ChecklistItem> = [
    {
      id: 'deploy',
      title: 'Deploy your app',
      summary: 'Publish it so your team can open it.',
      steps: [
        'Publish this project with Netlify Drop (button below). It builds on publish, so you will be asked to sign up or log in first.',
        'Or, from a local copy: run `netlify init`, then `netlify deploy --build --prod`.',
        'Your deployed app saves records to Netlify Database automatically.',
      ],
      done: deployed,
      action: deployed
        ? undefined
        : { label: 'Deploy to Netlify', href: appConfig.dropUrl },
    },
    {
      id: 'signin',
      title: 'Turn on sign-in',
      summary: 'Require people to log in.',
      steps: [
        'Enable Identity in the Netlify dashboard. The app picks it up within a minute.',
        'New sign-ins start as a respondent automatically — there is no role to configure.',
      ],
      done: authEnabled,
      action: identityAction,
    },
    {
      id: 'admin',
      title: 'Make yourself the admin',
      summary: 'The first person to sign up becomes the admin.',
      steps: [
        'Sign up at /login before sharing the URL with anyone else.',
        `Admins hold the "${appConfig.adminRole}" role, which unlocks the audit log and usage events.`,
      ],
      done: authEnabled && isAdmin,
      action: identityAction,
    },
    {
      id: 'domain',
      title: 'Choose who can sign up',
      summary: 'Restrict signups, or invite people yourself.',
      steps: [
        'Set `ALLOWED_SIGNUP_DOMAIN` (e.g. acme.com) to accept only that exact email domain, or',
        'turn off open signups in Identity settings and invite people from the Identity tab.',
      ],
      action: identityAction,
    },
  ]

  const allDone = items.every((item) => item.done === undefined || item.done)
  if (dismissed || dismissedForNow || allDone) return null

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
              dismiss()
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
              <DialogDescription>{openItem.summary}</DialogDescription>
            </DialogHeader>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {openItem.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <DialogFooter showCloseButton>
              {openItem.action ? (
                <Button asChild>
                  <a href={openItem.action.href} target="_blank" rel="noreferrer">
                    {openItem.action.label}
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
