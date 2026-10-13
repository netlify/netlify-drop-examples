import { AlertTriangle } from 'lucide-react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Button, Alert, AlertDescription, AlertTitle } from 'app-packs-ui'

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
