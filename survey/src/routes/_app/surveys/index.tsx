import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ClipboardList } from 'lucide-react'
import { Badge, EmptyState } from 'app-packs-ui'
import { requireViewer } from '@/auth/server'
import { appConfig } from '@/config/app'
import { listSurveys } from '@/data/surveys'
import { getResponseForRespondent } from '@/data/survey-responses'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'

type SurveyListRow = {
  id: string
  title: string
  description: string | null
  status: string
  myStatus: 'not_started' | 'submitted'
}

/**
 * Route-local loader (see `_app/admin/audit.tsx` for the same pattern) —
 * shows every non-draft survey with the viewer's own status. Unlike
 * `/admin/surveys` (the admin's manage list, gated `requireRole`-only),
 * this is the shared "browse and take a survey" view any signed-in-or-demo
 * viewer can reach, admin or not — nothing stops an admin from also
 * personally answering a survey.
 */
const listSurveysForViewerServer = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireViewer()
  const all = await listSurveys()
  const visible = all.filter((s) => s.status !== 'draft')

  return Promise.all(
    visible.map(async (survey): Promise<SurveyListRow> => {
      const mine = await getResponseForRespondent(survey.id, user.id)
      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        status: survey.status,
        myStatus: mine ? 'submitted' : 'not_started',
      }
    }),
  )
})

export const Route = createFileRoute('/_app/surveys/')({
  loader: () => listSurveysForViewerServer(),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'surveys')} />,
  component: SurveysPage,
})

const statusVariant: Record<string, 'primary' | 'secondary' | 'outline'> = {
  active: 'primary',
  closed: 'outline',
}

function SurveysPage() {
  const surveys = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Surveys</h1>
        <p className="text-muted-foreground">Surveys open for your response.</p>
      </div>

      {surveys.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="No surveys yet"
          description={`Check back once ${appConfig.roleLabels.admin} publishes a survey for you to take.`}
        />
      ) : (
        // `minmax(0,1fr)` keeps long titles/descriptions from stretching the
        // grid track (and the whole page) past the viewport on narrow screens.
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {surveys.map((survey) => (
            <Link
              key={survey.id}
              to="/surveys/$id"
              params={{ id: survey.id }}
              className="flex flex-col gap-3 rounded-lg border p-4 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <p className="font-medium sm:truncate">{survey.title}</p>
                {survey.description ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground sm:truncate">
                    {survey.description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant={statusVariant[survey.status] ?? 'secondary'}>{survey.status}</Badge>
                {survey.myStatus === 'submitted' ? (
                  <Badge variant="outline">Submitted</Badge>
                ) : (
                  <Badge variant="secondary">Not started</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
