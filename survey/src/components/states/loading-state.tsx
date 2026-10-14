import { Skeleton } from 'app-packs-ui'

type LoadingVariant = 'table' | 'form' | 'card' | 'page'

export function LoadingState({ variant = 'page' }: { variant?: LoadingVariant }) {
  if (variant === 'table') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="space-y-2 rounded-md border p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'form') {
    return (
      <div className="max-w-lg space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-6 w-40" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
    </div>
  )
}
