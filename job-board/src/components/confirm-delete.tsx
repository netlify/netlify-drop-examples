import type { ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from 'app-packs-ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/**
 * A Delete button that asks first. Deletes in this app are soft deletes (see
 * `src/db/soft-delete.ts`), but nothing in the UI brings a row back, so the
 * copy treats them as permanent.
 */
export function ConfirmDelete({
  title,
  description,
  label = 'Delete',
  disabled,
  trigger,
  onConfirm,
}: {
  title: string
  description: ReactNode
  label?: string
  disabled?: boolean
  trigger?: ReactNode
  onConfirm: () => void | Promise<void>
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="small" disabled={disabled}>
            <Trash2 className="size-4" />
            {label}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={disabled} onClick={() => onConfirm()}>
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
