import { X } from 'lucide-react'
import { Alert, AlertDescription, Button } from 'app-packs-ui'
import { useAppState } from '../store'
import { appConfig } from '../config/app'
import { useAppContext } from '../server/context'

export function TopBanner() {
  const { isBannerVisible, setBannerVisible } = useAppState()
  const { officialDemoSite } = useAppContext()
  const { messagesPerVisitor, maxInputChars } = appConfig.demoLimits

  if (!isBannerVisible) {
    return null
  }

  return (
    <Alert variant="accent" className="relative pr-12">
      {officialDemoSite ? (
        <AlertDescription>
          This is a demo: you can send {messagesPerVisitor} messages a day, up to {maxInputChars}{' '}
          characters each.{' '}
          <a href="https://app.netlify.com/drop?example=chat" className="underline">
            Make this app yours
          </a>{' '}
          to chat without limits, through{' '}
          <a href="https://docs.netlify.com/build/ai-gateway/overview/" className="underline">
            Netlify AI Gateway
          </a>
          .
        </AlertDescription>
      ) : (
      <AlertDescription>
        This app works with{' '}
        <a href="https://docs.netlify.com/build/ai-gateway/overview/" className="underline">
          Netlify AI Gateway
        </a>
        . If you want to use your own Anthropic key, update{' '}
        <a
          href="https://docs.netlify.com/build/environment-variables/overview/"
          className="underline"
        >
          the environment variables
        </a>{' '}
        in your project.
      </AlertDescription>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close banner"
        className="absolute top-2 right-2"
        onClick={() => setBannerVisible(false)}
      >
        <X className="size-4" />
      </Button>
    </Alert>
  )
}
