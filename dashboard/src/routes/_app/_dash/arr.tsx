import { createFileRoute } from '@tanstack/react-router'
import { ChartCard } from '@/components/dashboard/chart-card'
import { ArrChart, arrTable } from '@/components/dashboard/charts'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { getArrMovements } from '@/server/dashboard'
import { resolveRange } from '@/lib/range'

export const Route = createFileRoute('/_app/_dash/arr')({
  loaderDeps: ({ search }) => ({ range: resolveRange(search) }),
  loader: ({ deps }) => getArrMovements({ data: deps.range }),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'ARR')} />,
  component: ArrPage,
})

function ArrPage() {
  const { movements } = Route.useLoaderData()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">ARR</h1>
        <p className="text-muted-foreground">Monthly movements: new, expansion, contraction and churn.</p>
      </div>
      <ChartCard
        title="ARR movements"
        description="Gains above the axis, losses below; the line is net new ARR."
        table={arrTable(movements)}
      >
        <ArrChart movements={movements} />
      </ChartCard>
    </div>
  )
}
