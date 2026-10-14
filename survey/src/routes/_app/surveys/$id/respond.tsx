import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { toast, Card, CardContent, CardHeader, CardTitle, CardDescription, Button, RadioGroup, RadioGroupItem } from 'app-packs-ui'
import { requireViewer } from '@/auth/server'
import { getSurvey } from '@/data/surveys'
import { getResponseForRespondent } from '@/data/survey-responses'
import { submitResponseServer } from '@/server/survey-responses'
import { useSubmission } from '@/lib/submission'
import { Textarea } from '@/components/ui/textarea'
import { LoadingState } from '@/components/states/loading-state'
import { EntityErrorState } from '@/components/states/error-state'

const getRespondPageServer = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireViewer()
    const survey = await getSurvey(data.id)
    if (!survey) throw new Error('404: survey not found')
    const existing = await getResponseForRespondent(data.id, user.id)
    return { survey, alreadyResponded: !!existing }
  })

export const Route = createFileRoute('/_app/surveys/$id/respond')({
  loader: async ({ params }) => {
    const { survey, alreadyResponded } = await getRespondPageServer({ data: { id: params.id } })
    if (survey.status !== 'active' || alreadyResponded) {
      throw redirect({ to: '/surveys/$id', params: { id: params.id } })
    }
    return survey
  },
  pendingComponent: () => <LoadingState variant="page" />,
  errorComponent: ({ error }) => <EntityErrorState error={error} entityLabel="Survey" />,
  component: RespondPage,
})

function RespondPage() {
  const survey = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { state, run } = useSubmission(submitResponseServer)

  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const question = survey.questions[index]
  const isLast = index === survey.questions.length - 1
  const answer = answers[question.id]

  async function handleNext() {
    if (!isLast) {
      setIndex((i) => i + 1)
      return
    }
    await run({ data: { surveyId: id, answers } })
    toast({ title: 'Response submitted', description: 'Thanks for sharing your feedback.' })
    navigate({ to: '/surveys/$id', params: { id } })
  }

  function setAnswer(value: string) {
    setAnswers((a) => ({ ...a, [question.id]: value }))
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Question {index + 1} of {survey.questions.length}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>{question.text}</CardTitle>
          {question.type === 'rating' ? (
            <CardDescription>Choose a number from 1 (lowest) to {question.scale ?? 5} (highest).</CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {question.type === 'multiple_choice' ? (
            <RadioGroup name={`question-${question.id}`} className="space-y-2">
              {question.options?.map((option) => (
                <RadioGroupItem
                  key={option}
                  label={option}
                  value={option}
                  checked={answer === option}
                  onChange={() => setAnswer(option)}
                />
              ))}
            </RadioGroup>
          ) : null}

          {question.type === 'rating' ? (
            <RadioGroup name={`question-${question.id}`} className="flex gap-4">
              {Array.from({ length: question.scale ?? 5 }, (_, i) => String(i + 1)).map((value) => (
                <RadioGroupItem
                  key={value}
                  label={value}
                  value={value}
                  checked={answer === value}
                  onChange={() => setAnswer(value)}
                />
              ))}
            </RadioGroup>
          ) : null}

          {question.type === 'free_text' ? (
            <Textarea
              rows={4}
              value={answer ?? ''}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer..."
            />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          Back
        </Button>
        <Button
          type="button"
          disabled={!answer?.trim() || state.status === 'submitting'}
          onClick={handleNext}
        >
          {isLast ? 'Submit' : 'Next'}
        </Button>
      </div>
    </div>
  )
}
