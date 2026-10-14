import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Database, Fingerprint, Rocket, ShieldCheck, type LucideIcon } from 'lucide-react'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'app-packs-ui'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  const { authEnabled, demoMode, user } = useAppContext()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">About {appConfig.productName}</h1>
          <Badge variant={demoMode ? 'secondary' : 'outline'}>
            {demoMode ? 'Sample data' : 'Live data'}
          </Badge>
          <Badge variant={authEnabled ? 'primary' : 'outline'}>
            {authEnabled ? 'Identity on' : 'Identity off'}
          </Badge>
        </div>
        <p className="max-w-3xl text-muted-foreground">
          This app saves records in Netlify Database and uses Netlify Identity for sign-in and
          permissions. Running on your own computer, it uses sample data so you can explore the
          workflow first.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          icon={Database}
          title="Netlify Database"
          description={
            demoMode
              ? 'Sample data is active right now; deployed copies store records in Netlify Database.'
              : 'Records are stored in Netlify Database.'
          }
        >
          <p>
            Sample data resets whenever the app restarts. Once you deploy your own copy, records are
            saved in Netlify Database automatically — there's nothing to switch on.
          </p>
        </InfoCard>

        <InfoCard
          icon={Fingerprint}
          title="Identity"
          description={
            authEnabled
              ? user
                ? `Signed in as ${user.email ?? user.id}.`
                : "Identity is turned on, but nobody's signed in right now."
              : "Identity isn't turned on for this app yet."
          }
        >
          <p>
            Netlify Identity handles accounts and sign-in, and roles control what each person is
            allowed to do.
          </p>
        </InfoCard>

        <InfoCard
          icon={ShieldCheck}
          title="Permissions"
          description="Screens hide options you're not allowed to use, but the real check happens behind the scenes too."
        >
          <p>
            Every action is double-checked on the server, not just hidden from view — so permissions
            can't be bypassed by changing what's shown on screen.
          </p>
        </InfoCard>

        <InfoCard
          icon={Rocket}
          title="Publishing"
          description="You can publish this app any time, without setting up GitHub."
        >
          <p>Use the Deploy button to publish your changes — no code experience needed.</p>
        </InfoCard>
      </div>
    </div>
  )
}

type InfoCardProps = {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
}

function InfoCard({ icon: Icon, title, description, children }: InfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-muted-foreground">{children}</CardContent>
    </Card>
  )
}
