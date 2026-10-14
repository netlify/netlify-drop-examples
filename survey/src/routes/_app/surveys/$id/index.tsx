import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { toast, Card, CardContent, CardHeader, CardTitle, Badge, Button } from 'app-packs-ui'
import { BarChart3, Trash2 } from 'lucide-react'
import { requireViewer } from '@/auth/server'
import { appConfig } from '@/config/app'
import { getSurvey } from '@/data/surveys'
import { listResponsesForSurvey, getResponseForRespondent } from '@/data/survey-responses'
import { updateSurveyServer, deleteSurveyServer, surveyStatusValues } from '@/server/surveys'
import { useSubmission } from '@/lib/submission'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { LoadingState } from '@/components/states/loading-state'
import { EntityErrorState } from '@/components/states/error-state'

const getSurveyDetailServer = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireViewer()
    const isAdmin = (user.roles ?? []).includes(appConfig.adminRole)
    const survey = await getSurvey(data.id)
    if (!survey) throw new Error('404: survey not found')
    const responseCount = (await listResponsesForSurvey(data.id)).length
    const myResponse = await getResponseForRespondent(data.id, user.id)
    return { survey, isAdmin, responseCount, myResponse }
  })

export const Route = createFileRoute('/_app/surveys/$id/')({
  loader: ({ params }) => getSurveyDetailServer({ data: { id: params.id } }),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <EntityErrorState error={error} entityLabel="Survey" />,
  component: SurveyDetailPage,
})

const statusVariant: Record<string, 'primary' | 'secondary' | 'outline'> = {
  active: 'primary',
  draft: 'secondary',
  closed: 'outline',
}

function SurveyDetailPage() {
  const { survey, isAdmin, responseCount, myResponse } = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [status, setStatus] = useState<(typeof surveyStatusValues)[number]>(
    survey.status as (typeof surveyStatusValues)[number],
  )
  const { state: saveState, run: runSave } = useSubmission(updateSurveyServer)
  const { state: deleteState, run: runDelete } = useSubmission(deleteSurveyServer)

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{survey.title}</h1>
            <Badge variant={statusVariant[survey.status] ?? 'secondary'}>{survey.status}</Badge>
          </div>
          {survey.description ? <p className="text-muted-foreground">{survey.description}</p> : null}
        </div>

        {isAdmin ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="small">
                <Trash2 className="size-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this survey?</AlertDialogTitle>
                <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleteState.status === 'submitting'}
                  onClick={async () => {
                    await runDelete({ data: { id } })
                    toast({ title: 'Survey deleted' })
                    navigate({ to: '/admin/surveys' })
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Questions</span>
            <span>{survey.questions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Anonymous</span>
            <span>{survey.anonymous ? 'Yes' : 'No'}</span>
          </div>

          {isAdmin ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Responses</span>
                <span>{responseCount}</span>
              </div>

              <div className="flex items-center gap-2 border-t pt-4">
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {surveyStatusValues.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="small"
                  disabled={saveState.status === 'submitting' || status === survey.status}
                  onClick={async () => {
                    await runSave({ data: { id, status } })
                    toast({ title: 'Status updated' })
                  }}
                >
                  Update status
                </Button>
                <Button asChild size="small" variant="outline" className="ml-auto">
                  <Link to="/surveys/$id/results" params={{ id }}>
                    <BarChart3 className="size-4" />
                    View results
                  </Link>
                </Button>
              </div>
            </>
          ) : null}

          {/* Shown to every viewer, admin or not — nothing stops an admin
              from also personally answering a survey, and this is the only
              path to the take-survey flow, so it must stay visible
              regardless of role. */}
          <div className="border-t pt-4">
            {myResponse ? (
              <p className="text-muted-foreground">
                You submitted this on {new Date(myResponse.submittedAt).toLocaleDateString()}.
              </p>
            ) : survey.status === 'active' ? (
              <Button asChild>
                <Link to="/surveys/$id/respond" params={{ id }}>
                  Start survey
                </Link>
              </Button>
            ) : (
              <p className="text-muted-foreground">This survey isn't currently accepting responses.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
