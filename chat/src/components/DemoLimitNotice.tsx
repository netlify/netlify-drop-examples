import { ExternalLink } from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from 'app-packs-ui'
import { appConfig } from '../config/app'
import type { DemoLimitReason } from '../server/demo-limits'

/**
 * Shown in place of a reply when the official demo's caps are used up
 * (see `appConfig.demoLimits`). Points people at deploying their own copy.
 */
export function DemoLimitNotice({ reason }: { reason: DemoLimitReason }) {
  const { messagesPerVisitor } = appConfig.demoLimits

  return (
    <Card variant="muted" className="my-6" role="status">
      <CardHeader>
        <CardTitle>
          {reason === 'visitor'
            ? `That's your ${messagesPerVisitor} demo messages for today`
            : 'The demo is out of messages for today'}
        </CardTitle>
        <CardDescription>
          This public demo is capped to keep AI costs down. Deploy your own copy of{' '}
          {appConfig.productName} to keep chatting: it runs on your own Netlify account through
          AI Gateway, with no API key to set up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="small">
          <a href="https://app.netlify.com/drop?example=chat" target="_blank" rel="noreferrer">
            Make this app yours
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
