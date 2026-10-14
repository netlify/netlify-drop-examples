import { AlertTriangle } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button, Alert, AlertDescription, AlertTitle, NotFoundState } from 'app-packs-ui'

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string
  message: string
  onRetry?: () => void
}) {
  return (
    <Alert variant="destructive" className="max-w-xl">
      <AlertTriangle className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{message}</p>
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
      <ErrorState message={error instanceof Error ? error.message : 'Unexpected error'} onRetry={reset} />
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
      <ErrorState message={message} />
    </div>
  )
}
