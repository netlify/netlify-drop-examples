import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button } from 'app-packs-ui'
import { requireRole, auditRead } from '@/auth/server'
import { appConfig } from '@/config/app'
import { getResponse } from '@/data/survey-responses'
import { getSurvey } from '@/data/surveys'
import { LoadingState } from '@/components/states/loading-state'
import { EntityErrorState } from '@/components/states/error-state'

const getResponseDetailServer = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireRole([appConfig.adminRole])
    const response = await getResponse(data.id)
    if (!response) throw new Error('404: response not found')
    // Read-level audit trail (see README > Audit logging) — an individual,
    // attributed survey response is exactly the "who viewed whose answers"
    // case `auditRead` exists for.
    await auditRead('survey_response.viewed', 'survey_response', data.id)
    const survey = await getSurvey(response.surveyId)

    const answers = survey
      ? survey.questions.map((question) => {
          const raw = response.answers[question.id] ?? '—'
          const answer = question.type === 'rating' ? `${raw} / ${question.scale ?? 5}` : raw
          return { prompt: question.text, answer }
        })
      : Object.entries(response.answers).map(([question, answer]) => ({ prompt: question, answer }))

    const respondent = survey?.anonymous !== false ? 'Anonymous' : (response.respondentEmail ?? 'Unknown')

    return {
      surveyId: response.surveyId,
      surveyTitle: survey?.title ?? 'Deleted survey',
      respondent,
      submittedAt: response.submittedAt,
      answers,
    }
  })

export const Route = createFileRoute('/_app/admin/responses/$id')({
  loader: ({ params }) => getResponseDetailServer({ data: { id: params.id } }),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <EntityErrorState error={error} entityLabel="Response" />,
  component: ResponseDetailPage,
})

function ResponseDetailPage() {
  const { surveyId, surveyTitle, respondent, submittedAt, answers } = Route.useLoaderData()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="small" className="-ml-2">
          <Link to="/admin/responses">
            <ArrowLeft className="size-4" />
            Back to responses
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">
          <Link to="/surveys/$id" params={{ id: surveyId }} className="hover:underline">
            {surveyTitle}
          </Link>
        </h1>
        <p className="text-muted-foreground">
          {respondent} · submitted {new Date(submittedAt).toLocaleString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Answers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {answers.map((a, i) => (
            <div key={i} className="space-y-1 border-b pb-3 last:border-b-0 last:pb-0">
              <p className="text-sm font-medium">{a.prompt}</p>
              <p className="text-sm text-muted-foreground">{a.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
