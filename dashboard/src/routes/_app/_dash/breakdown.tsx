import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Inbox } from 'lucide-react'
import { EmptyState } from 'app-packs-ui'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { getBreakdown } from '@/server/dashboard'
import { money, pct } from '@/lib/format'
import { resolveRange } from '@/lib/range'
import type { BreakdownRow } from '@/lib/metrics'

const groupings = ['segment', 'owner', 'stage'] as const
type Grouping = (typeof groupings)[number]

export const Route = createFileRoute('/_app/_dash/breakdown')({
  validateSearch: (s: Record<string, unknown>): { group?: Grouping } => ({
    group: groupings.find((g) => g === s.group),
  }),
  loaderDeps: ({ search }) => ({ range: resolveRange(search), group: search.group ?? 'segment' }),
  loader: ({ deps }) => getBreakdown({ data: { ...deps.range, groupBy: deps.group } }),
  pendingComponent: () => <LoadingState variant="table" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'the breakdown')} />,
  component: BreakdownPage,
})

function col(key: keyof BreakdownRow, title: string, fmt: (v: never) => string): DataTableColumn<BreakdownRow> {
  return {
    accessorKey: key,
    header: ({ column }) => <DataTableColumnHeader column={column} title={title} />,
    cell: ({ getValue }) => <span className="tabular-nums">{fmt(getValue() as never)}</span>,
    sortUndefined: 'last',
  } as DataTableColumn<BreakdownRow>
}

const columns: Array<DataTableColumn<BreakdownRow>> = [
  {
    accessorKey: 'group',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Group" />,
    cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
  },
  col('openPipeline', 'Open pipeline', (v: number) => money(v, false)),
  col('weightedPipeline', 'Weighted', (v: number) => money(v, false)),
  col('wonArr', 'Closed-won', (v: number) => money(v, false)),
  col('wonCount', 'Won', (v: number) => String(v)),
  col('lostCount', 'Lost', (v: number) => String(v)),
  col('winRate', 'Win rate', (v: number | null) => pct(v)),
]

function BreakdownPage() {
  const { rows } = Route.useLoaderData()
  const group = Route.useSearch().group ?? 'segment'
  const navigate = useNavigate()
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Breakdown</h1>
          <p className="text-muted-foreground">Aggregated results for opportunities closing in the selected range.</p>
        </div>
        <Tabs value={group} onValueChange={(v) => navigate({ to: '.', search: (prev: object) => ({ ...prev, group: v as Grouping }) })}>
          <TabsList>
            {groupings.map((g) => (
              <TabsTrigger key={g} value={g} className="capitalize">
                {g}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder={`Search ${group}...`}
        emptyState={<EmptyState icon={<Inbox />} title="No results" description="Nothing closes in this range." />}
      />
    </div>
  )
}
