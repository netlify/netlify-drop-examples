import { X } from 'lucide-react'
import { Alert, AlertDescription, Button } from 'app-packs-ui'
import { useAppState } from '../store'

export function TopBanner() {
  const { isBannerVisible, setBannerVisible } = useAppState()

  if (!isBannerVisible) {
    return null
  }

  return (
    <Alert variant="accent" className="relative pr-12">
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
