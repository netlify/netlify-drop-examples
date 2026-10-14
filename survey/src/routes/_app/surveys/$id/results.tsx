import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Progress, Button } from 'app-packs-ui'
import { requireRole } from '@/auth/server'
import { appConfig } from '@/config/app'
import { getSurvey } from '@/data/surveys'
import { listResponsesForSurvey } from '@/data/survey-responses'
import { LoadingState } from '@/components/states/loading-state'
import { EntityErrorState } from '@/components/states/error-state'

const getSurveyResultsServer = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireRole([appConfig.adminRole])
    const survey = await getSurvey(data.id)
    if (!survey) throw new Error('404: survey not found')
    const responses = await listResponsesForSurvey(data.id)
    return { survey, responses }
  })

export const Route = createFileRoute('/_app/surveys/$id/results')({
  loader: ({ params }) => getSurveyResultsServer({ data: { id: params.id } }),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <EntityErrorState error={error} entityLabel="Survey" />,
  component: SurveyResultsPage,
})

function SurveyResultsPage() {
  const { survey, responses } = Route.useLoaderData()
  const { id } = Route.useParams()
  const total = responses.length

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="small" className="-ml-2">
          <Link to="/surveys/$id" params={{ id }}>
            <ArrowLeft className="size-4" />
            Back to survey
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{survey.title} — Results</h1>
        <p className="text-muted-foreground">
          {total} response{total === 1 ? '' : 's'} collected so far.
        </p>
      </div>

      {total === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No responses yet — results will appear here once people start answering.
          </CardContent>
        </Card>
      ) : (
        survey.questions.map((question) => {
          const answers = responses.map((r) => r.answers[question.id]).filter((a): a is string => !!a)

          return (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-base">{question.text}</CardTitle>
                <CardDescription>
                  {answers.length} answered
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {question.type === 'multiple_choice' ? (
                  question.options?.map((option) => {
                    const count = answers.filter((a) => a === option).length
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0
                    return (
                      <div key={option} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{option}</span>
                          <span className="text-muted-foreground">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <Progress value={pct} />
                      </div>
                    )
                  })
                ) : null}

                {question.type === 'rating' ? (
                  <>
                    <p className="text-sm">
                      Average:{' '}
                      <span className="font-medium">
                        {(answers.reduce((sum, a) => sum + Number(a), 0) / answers.length).toFixed(1)}
                      </span>{' '}
                      / {question.scale ?? 5}
                    </p>
                    {Array.from({ length: question.scale ?? 5 }, (_, i) => String(i + 1)).map((value) => {
                      const count = answers.filter((a) => a === value).length
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0
                      return (
                        <div key={value} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{value}</span>
                            <span className="text-muted-foreground">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <Progress value={pct} />
                        </div>
                      )
                    })}
                  </>
                ) : null}

                {question.type === 'free_text' ? (
                  <ul className="space-y-2">
                    {answers.map((a, i) => (
                      <li key={i} className="rounded-md border p-2 text-sm text-muted-foreground">
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
