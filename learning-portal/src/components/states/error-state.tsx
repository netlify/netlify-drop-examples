import { AlertTriangle } from 'lucide-react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button, Alert, AlertDescription, AlertTitle } from 'app-packs-ui'

// Errors the app throws on purpose start with an HTTP-style status, e.g.
// "403: you need one of these roles…" or "404: record not found". Those read
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
