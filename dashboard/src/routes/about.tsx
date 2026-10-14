import type { ReactNode } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Database, Fingerprint, Rocket, ShieldCheck, type LucideIcon } from 'lucide-react'
import { appConfig } from '@/config/app'
import { dashboardConfig } from '@/config/dashboard'
import { useAppContext } from '@/server/context'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from 'app-packs-ui'

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
          <Badge variant={demoMode ? 'secondary' : 'outline'}>{demoMode ? 'Sample data' : 'Live data'}</Badge>
          <Badge variant={authEnabled ? 'primary' : 'outline'}>
            {authEnabled ? 'Identity on' : 'Identity off'}
          </Badge>
        </div>
        <p className="max-w-3xl text-muted-foreground">
          A read-only view of pipeline and recurring revenue. Builders load data from CSV (or Snowflake);
          everyone else just views it. This dataset is classified Tier{' '}
          {dashboardConfig.dataClassification.tier}: {dashboardConfig.dataClassification.label.toLowerCase()}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <InfoCard
          icon={Database}
          title="Data"
          description={
            demoMode
              ? 'Showing synthetic sample data for a fictional company.'
              : 'Showing data loaded by your team.'
          }
        >
          <p>
            Datasets are loaded in full, validated against a fixed set of columns, and stored encrypted in
            Netlify Database. Dashboards read the stored copy, never the source system.
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
            Netlify Identity handles accounts and sign-in, and roles control what each person is allowed to
            do.
          </p>
        </InfoCard>

        <InfoCard
          icon={ShieldCheck}
          title="Permissions"
          description="Viewers see the dashboard; editors and admins can also load data."
        >
          <p>
            Every request is checked on the server, and every dashboard view is recorded in the audit log.
            Only totals and groupings are sent to your browser, never individual deals.
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
