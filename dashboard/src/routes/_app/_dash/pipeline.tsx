import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartCard } from '@/components/dashboard/chart-card'
import { PipelineChart, pipelineTable } from '@/components/dashboard/charts'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { getPipelineByStage } from '@/server/dashboard'
import { resolveRange } from '@/lib/range'

const breakdowns = ['segment', 'owner', 'source'] as const
type Breakdown = (typeof breakdowns)[number]

export const Route = createFileRoute('/_app/_dash/pipeline')({
  validateSearch: (s: Record<string, unknown>): { by?: Breakdown } => ({
    by: breakdowns.find((b) => b === s.by),
  }),
  loaderDeps: ({ search }) => ({ range: resolveRange(search), by: search.by ?? 'segment' }),
  loader: ({ deps }) => getPipelineByStage({ data: { ...deps.range, breakdown: deps.by } }),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'the pipeline')} />,
  component: PipelinePage,
})

function PipelinePage() {
  const { series, rows } = Route.useLoaderData()
  const by = Route.useSearch().by ?? 'segment'
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-muted-foreground">Open pipeline by stage for deals closing in the selected range.</p>
        </div>
        <Tabs value={by} onValueChange={(v) => navigate({ to: '.', search: (prev: object) => ({ ...prev, by: v as Breakdown }) })}>
          <TabsList>
            {breakdowns.map((b) => (
              <TabsTrigger key={b} value={b} className="capitalize">
                {b}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <ChartCard title="Open pipeline by stage" description={`Stacked by ${by}`} table={pipelineTable(series, rows)}>
        <PipelineChart series={series} rows={rows} />
      </ChartCard>
    </div>
  )
}
