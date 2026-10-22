import { useEffect, useRef, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** id of the element that titles the modal. */
  labelledBy: string
  className?: string
  children: ReactNode
}

/**
 * Native `<dialog>` driven by props, so focus trapping, Escape, and top-layer
 * rendering come for free. Clicking the backdrop closes it. `app-packs-ui`
 * has no dialog, so put a `Card` inside for the panel.
 */
export function Modal({ open, onClose, labelledBy, className, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={`m-auto w-full bg-transparent p-4 backdrop:bg-black/50 backdrop:backdrop-blur-sm ${className ?? 'max-w-2xl'}`}
    >
      {children}
    </dialog>
  )
}
