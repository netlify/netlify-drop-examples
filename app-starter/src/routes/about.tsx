import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { Button } from 'app-packs-ui'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

/**
 * Orients: one paragraph and a link to the template page. Setup steps belong
 * in the Finish setting up checklist and the template page, never here.
 */
function AboutPage() {
  const { demoMode } = useAppContext()

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">About this app</h1>
      <p className="text-muted-foreground">
        {demoMode
          ? `This is a starting point for ${appConfig.packDescription}. You're viewing a demo with sample data, so click around freely. Nothing you change here is saved.`
          : 'This app was built from an App Pack. Your records are saved in Netlify Database.'}
      </p>
      <Button asChild variant="outline">
        <a
          href={appConfig.templatePageUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="See everything you can configure (opens in a new tab)"
        >
          See everything you can configure
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </Button>
    </div>
  )
}
