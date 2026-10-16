import { createFileRoute, Link } from '@tanstack/react-router'
import { ClipboardList, ListChecks, Users } from 'lucide-react'
import { listSurveysServer } from '@/server/surveys'
import { appConfig } from '@/config/app'
import type { SurveyRow } from '@/db/schema'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, EmptyState } from 'app-packs-ui'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'

type HomeData = { isAdmin: true; surveys: Array<SurveyRow> } | { isAdmin: false }

// This home page's own survey overview is admin-only (`listSurveysServer`,
// see src/server/surveys.ts, is `requireRole`-gated) — the respondent-facing
// "browse and take a survey" experience lives at `/surveys` instead (see
// src/routes/_app/surveys/), which any signed-in-or-demo viewer can reach.
// The loader checks the role itself and skips the admin-gated
// `listSurveysServer()` call entirely for everyone else, rather than
// letting it throw a 403 on the app's own home page. Mirrors the same
// `!authEnabled || isAdmin` check user-menu.tsx uses to decide which links
// it shows.
export const Route = createFileRoute('/')({
  loader: async ({ context }): Promise<HomeData> => {
    const isAdmin = !context.authEnabled || (context.user?.roles?.includes(appConfig.adminRole) ?? false)
    if (!isAdmin) return { isAdmin: false }
    const surveys = await listSurveysServer()
    return { isAdmin: true, surveys }
  },
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'the home page')} />,
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  return data.isAdmin ? <AdminHome surveys={data.surveys} /> : <RespondentHome />
}

function AdminHome({ surveys }: { surveys: Array<SurveyRow> }) {
  const totalQuestions = surveys.reduce((sum, s) => sum + s.questions.length, 0)
  const recent = surveys.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-muted-foreground">An overview of your surveys.</p>
        </div>
        <Button asChild>
          <Link to="/admin/surveys/new">New survey</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total surveys</CardTitle>
            <ClipboardList className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{surveys.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total questions</CardTitle>
            <ListChecks className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent surveys</CardTitle>
            <CardDescription>The 5 most recently created surveys.</CardDescription>
          </div>
          <Button asChild size="small" variant="outline">
            <Link to="/admin/surveys">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No surveys yet.</p>
          ) : (
            recent.map((survey) => (
              <Link
                key={survey.id}
                to="/surveys/$id"
                params={{ id: survey.id }}
                className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{survey.title}</p>
                  <p className="truncate text-muted-foreground">{survey.description ?? 'No description'}</p>
                </div>
                <span className="shrink-0 text-muted-foreground">
                  {survey.questions.length} question{survey.questions.length === 1 ? '' : 's'}
                </span>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RespondentHome() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <EmptyState
        icon={<Users />}
        title={`Welcome to ${appConfig.productName}`}
        description="Check the Surveys tab for anything open for your response."
        action={
          <Button asChild size="small">
            <Link to="/surveys">View surveys</Link>
          </Button>
        }
      />
    </div>
  )
}
