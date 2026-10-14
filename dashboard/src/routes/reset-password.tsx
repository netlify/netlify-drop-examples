import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ResetPasswordForm } from '@/auth/client'

const searchSchema = z.object({
  flow: z.enum(['recovery', 'invite']).default('recovery'),
  token: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <ResetPasswordForm />
    </div>
  )
}
