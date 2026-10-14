import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { BarChart3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Badge, EmptyState } from 'app-packs-ui'
import { requireRole } from '@/auth/server'
import { appConfig } from '@/config/app'
import { listSurveys } from '@/data/surveys'
import { listResponsesForSurvey } from '@/data/survey-responses'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState } from '@/components/states/error-state'

const listSurveyResultsSummaryServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole([appConfig.adminRole])
  const surveys = await listSurveys()
  return Promise.all(
    surveys.map(async (survey) => ({
      id: survey.id,
      title: survey.title,
      status: survey.status,
      responseCount: (await listResponsesForSurvey(survey.id)).length,
    })),
  )
})

export const Route = createFileRoute('/_app/admin/results/')({
  loader: () => listSurveyResultsSummaryServer(),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : 'Failed to load results'} />
  ),
  component: ResultsOverviewPage,
})

const statusVariant: Record<string, 'primary' | 'secondary' | 'outline'> = {
  active: 'primary',
  draft: 'secondary',
  closed: 'outline',
}

function ResultsOverviewPage() {
  const surveys = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Results</h1>
        <p className="text-muted-foreground">Response counts across every survey. Pick one for the breakdown.</p>
      </div>

      {surveys.length === 0 ? (
        <EmptyState
          icon={<BarChart3 />}
          title="No surveys yet"
          description="Create a survey to start collecting results."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {surveys.map((survey) => (
            <Link key={survey.id} to="/surveys/$id/results" params={{ id: survey.id }}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{survey.title}</CardTitle>
                  <Badge variant={statusVariant[survey.status] ?? 'secondary'}>{survey.status}</Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {survey.responseCount} response{survey.responseCount === 1 ? '' : 's'}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
