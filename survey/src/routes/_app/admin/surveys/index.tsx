import { createFileRoute, Link } from '@tanstack/react-router'
import { PlusCircle, ClipboardList } from 'lucide-react'
import { listSurveysServer } from '@/server/surveys'
import type { SurveyRow } from '@/db/schema'
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { Button, EmptyState } from 'app-packs-ui'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState } from '@/components/states/error-state'

export const Route = createFileRoute('/_app/admin/surveys/')({
  loader: () => listSurveysServer(),
  pendingComponent: () => <LoadingState variant="table" />,
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : 'Failed to load surveys'} />
  ),
  component: SurveysPage,
})

const columns: Array<DataTableColumn<SurveyRow>> = [
  {
    accessorKey: 'title',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
    cell: ({ row }) => (
      <Link to="/surveys/$id" params={{ id: row.original.id }} className="font-medium hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    cell: ({ getValue }) => {
      const value = getValue<string | null>()
      return <span className="text-muted-foreground">{value ?? '—'}</span>
    },
  },
  {
    id: 'questionCount',
    accessorFn: (row) => row.questions.length,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Questions" />,
  },
  {
    accessorKey: 'createdBy',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created by" />,
    cell: ({ getValue }) => getValue<string | null>() ?? 'unknown',
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString(),
  },
]

function SurveysPage() {
  const surveys = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Surveys</h1>
          <p className="text-muted-foreground">Create and manage surveys sent to respondents.</p>
        </div>
        <Button asChild>
          <Link to="/admin/surveys/new">
            <PlusCircle className="size-4" />
            New survey
          </Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={surveys}
        searchPlaceholder="Search surveys..."
        emptyState={
          <EmptyState
            icon={<ClipboardList />}
            title="No surveys"
            description="Create your first survey to get started."
            action={
              <Button asChild size="small">
                <Link to="/admin/surveys/new">New survey</Link>
              </Button>
            }
          />
        }
      />
    </div>
  )
}
