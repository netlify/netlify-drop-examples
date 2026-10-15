import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

// Orients only: one paragraph and a link to the template page. Setup steps
// and settings belong in the setup checklist and on the template page.
function AboutPage() {
  const { demoMode } = useAppContext()

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">About this app</h1>
      <p className="text-muted-foreground">
        {demoMode
          ? `This is a starting point for ${appConfig.packDescription}. You're viewing a demo with sample data, so click around freely. Nothing you change here is saved.`
          : `This is ${appConfig.productName}, built from an App Pack. Your records are saved in Netlify Database.`}
      </p>
      <a
        href={appConfig.templatePageUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        See everything you can configure
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </div>
  )
}
