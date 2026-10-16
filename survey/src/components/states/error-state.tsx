import { AlertTriangle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button, Alert, AlertDescription, AlertTitle, NotFoundState } from 'app-packs-ui'

// Errors the app throws on purpose start with an HTTP-style status, e.g.
// "403: you need one of these roles…" or "404: survey not found". Those read
// fine to anyone. Everything else (a driver or network message) is for
// developers, so people see a calm line and the real text sits in "Details".
const INTENTIONAL_ERROR = /^[1-5]\d\d: /

export function friendlyError(error: unknown, what = 'this page'): { message: string; details?: string } {
  const text = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (INTENTIONAL_ERROR.test(text)) return { message: text }
  return {
    message: `We couldn't load ${what} just now. Try again in a moment. If it keeps happening, ask whoever set up this app to take a look.`,
    details: text || undefined,
  }
}

export function ErrorState({
  title = "Couldn't load this",
  message,
  details,
  onRetry,
}: {
  title?: string
  message: string
  /** Technical text, tucked behind a "Details" toggle. */
  details?: string
  onRetry?: () => void
}) {
  return (
    <Alert variant="destructive" className="max-w-xl">
      <AlertTriangle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
        {details ? (
          <details className="text-xs">
            <summary className="cursor-pointer">Details</summary>
            <p className="mt-1 break-words">{details}</p>
          </details>
        ) : null}
        {onRetry ? (
          <Button size="small" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Used as the router's `defaultErrorComponent` and as `errorComponent` on
 * individual routes. Renders any thrown error (including 403s thrown by
 * `requireRole`) with a reset action.
 */
export function RouteErrorBoundary({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <ErrorState {...friendlyError(error)} onRetry={reset} />
    </div>
  )
}

/**
 * `errorComponent` for entity-detail routes (`/surveys/$id`,
 * `/admin/responses/$id`, etc.). Server functions throw `Error('404: ...')`
 * for both a malformed id and a well-formed-but-unknown one (see each
 * `src/server/*.ts`'s `idInput` validator, which uses a plain `z.string()`
 * rather than `.uuid()` for exactly this reason) — this renders that case
 * as a real not-found state instead of the red `ErrorState` alert, which
 * used to be the only option and made a routine "that survey doesn't
 * exist" look like a system failure.
 */
export function EntityErrorState({ error, entityLabel = 'item' }: { error: unknown; entityLabel?: string }) {
  const message = error instanceof Error ? error.message : 'Unexpected error'

  if (message.startsWith('404:')) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <NotFoundState
          title={`${entityLabel} not found`}
          description={`This ${entityLabel.toLowerCase()} doesn't exist, or may have been deleted.`}
          action={
            <Button asChild size="small">
              <Link to="/">Back home</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <ErrorState {...friendlyError(error, `this ${entityLabel.toLowerCase()}`)} />
    </div>
  )
}
