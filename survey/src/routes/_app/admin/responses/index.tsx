import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { Download, Inbox } from 'lucide-react'
import { Button, EmptyState } from 'app-packs-ui'
import { requireRole } from '@/auth/server'
import { appConfig } from '@/config/app'
import { listAllResponses } from '@/data/survey-responses'
import { listSurveys } from '@/data/surveys'
import { DataTable, type DataTableColumn } from '@/components/data-table/data-table'
import { DataTableColumnHeader } from '@/components/data-table/column-header'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState } from '@/components/states/error-state'

type ResponseRow = {
  id: string
  surveyId: string
  surveyTitle: string
  respondent: string
  submittedAt: string
}

const listResponsesWithSurveyServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole([appConfig.adminRole])
  const [responses, surveys] = await Promise.all([listAllResponses(), listSurveys()])
  const surveyById = new Map(surveys.map((s) => [s.id, s]))

  return responses.map((response): ResponseRow => {
    const survey = surveyById.get(response.surveyId)
    const respondent = survey?.anonymous !== false ? 'Anonymous' : (response.respondentEmail ?? 'Unknown')
    return {
      id: response.id,
      surveyId: response.surveyId,
      surveyTitle: survey?.title ?? 'Deleted survey',
      respondent,
      submittedAt: response.submittedAt.toISOString(),
    }
  })
})

export const Route = createFileRoute('/_app/admin/responses/')({
  loader: () => listResponsesWithSurveyServer(),
  pendingComponent: () => <LoadingState variant="table" />,
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : 'Failed to load responses'} />
  ),
  component: ResponsesPage,
})

const columns: Array<DataTableColumn<ResponseRow>> = [
  {
    accessorKey: 'surveyTitle',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Survey" />,
    cell: ({ row }) => (
      <Link to="/surveys/$id" params={{ id: row.original.surveyId }} className="hover:underline">
        {row.original.surveyTitle}
      </Link>
    ),
  },
  {
    accessorKey: 'respondent',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Respondent" />,
  },
  {
    accessorKey: 'submittedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Submitted" />,
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
  },
  {
    id: 'view',
    header: '',
    cell: ({ row }) => (
      <Link to="/admin/responses/$id" params={{ id: row.original.id }} className="text-sm hover:underline">
        View
      </Link>
    ),
  },
]

function downloadCsv(rows: Array<ResponseRow>) {
  const header = ['Survey', 'Respondent', 'Submitted']
  const csvRows = rows.map((r) => [r.surveyTitle, r.respondent, r.submittedAt])
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const csv = [header, ...csvRows].map((row) => row.map(escape).join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'survey-responses.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function ResponsesPage() {
  const responses = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Responses</h1>
          <p className="text-muted-foreground">Every submitted response, across all surveys.</p>
        </div>
        <Button
          variant="outline"
          size="small"
          disabled={responses.length === 0}
          onClick={() => downloadCsv(responses)}
        >
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={responses}
        searchPlaceholder="Search responses..."
        emptyState={
          <EmptyState
            icon={<Inbox />}
            title="No responses yet"
            description="Responses will appear here once people start answering surveys."
          />
        }
      />
    </div>
  )
}
