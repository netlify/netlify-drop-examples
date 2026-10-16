import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { DateRangePicker, LastUpdated, MethodologySheet } from '@/components/dashboard/header'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { getDashboardMeta } from '@/server/dashboard'
import { resolveRange, validateRangeSearch } from '@/lib/range'

/**
 * Shared layout for every dashboard view: the date range (URL search params
 * `from`/`to`, so views are linkable), "Last updated" stamps per dataset and
 * the methodology panel. Lives under `_app`, so it's auth-guarded.
 */
export const Route = createFileRoute('/_app/_dash')({
  validateSearch: validateRangeSearch,
  loader: () => getDashboardMeta(),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'the dashboard')} />,
  component: DashboardLayout,
})

function DashboardLayout() {
  const meta = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const range = resolveRange(search)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <LastUpdated meta={meta} />
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker
            range={range}
            onChange={(r) => navigate({ to: '.', search: (prev: object) => ({ ...prev, ...r }) })}
          />
          <MethodologySheet />
        </div>
      </div>
      <Outlet />
    </div>
  )
}
