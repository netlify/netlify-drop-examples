import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from 'app-packs-ui'
import type { SubmissionState } from '@/lib/submission'

/**
 * Generic submit button driven by `SubmissionState` (see lib/submission.ts)
 * rather than by TanStack Form's own `isSubmitting` — this lets the same
 * button work for form submissions, uploads, and any other async action
 * wired through `useSubmission()`.
 */
export function SubmitButton({
  state,
  children,
  submittingLabel = 'Saving...',
  ...props
}: {
  state: SubmissionState
  children: ReactNode
  submittingLabel?: string
} & Omit<React.ComponentProps<typeof Button>, 'children' | 'disabled'>) {
  const isSubmitting = state.status === 'submitting'
  return (
    <Button type="submit" disabled={isSubmitting} {...props}>
      {isSubmitting ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {submittingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
