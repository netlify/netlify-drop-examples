import { createFileRoute, Link } from '@tanstack/react-router'
import { Clock, DollarSign, Percent, Scale, Target, TrendingUp } from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from 'app-packs-ui'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { ArrChart, PipelineChart } from '@/components/dashboard/charts'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { getOverview } from '@/server/dashboard'
import { days, money, pct } from '@/lib/format'
import { resolveRange } from '@/lib/range'

export const Route = createFileRoute('/_app/_dash/')({
  loaderDeps: ({ search }) => ({ range: resolveRange(search) }),
  loader: ({ deps }) => getOverview({ data: deps.range }),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'the overview')} />,
  component: Overview,
})

function Overview() {
  const { kpis, pipeline, arrMovements } = Route.useLoaderData()
  const search = Route.useSearch()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-muted-foreground">Pipeline health and recurring revenue for the selected range.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Total pipeline" value={money(kpis.totalPipeline)} hint="Open deals closing in range" icon={DollarSign} />
        <KpiCard title="Weighted pipeline" value={money(kpis.weightedPipeline)} hint="Amount × stage probability" icon={Scale} />
        <KpiCard title="Closed-won ARR" value={money(kpis.closedWonArr)} hint="Won deals closed in range" icon={Target} />
        <KpiCard title="Win rate" value={pct(kpis.winRate)} hint="Won ÷ (won + lost)" icon={Percent} />
        <KpiCard title="Avg. sales cycle" value={days(kpis.avgSalesCycleDays)} hint="Created to close, won deals" icon={Clock} />
        <KpiCard title="Net new ARR" value={money(kpis.netNewArr)} hint="New + expansion − contraction − churn" icon={TrendingUp} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Open pipeline by stage</CardTitle>
              <CardDescription>Stacked by segment</CardDescription>
            </div>
            <Button asChild size="small" variant="outline">
              <Link to="/pipeline" search={search}>Details</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <PipelineChart series={pipeline.series} rows={pipeline.rows} height={240} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>ARR movements</CardTitle>
              <CardDescription>Monthly, with net line</CardDescription>
            </div>
            <Button asChild size="small" variant="outline">
              <Link to="/arr" search={search}>Details</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ArrChart movements={arrMovements} height={240} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
