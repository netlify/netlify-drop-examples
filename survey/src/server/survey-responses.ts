import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { appConfig } from '@/config/app'
import { requireViewer, requireRole, audit, auditRead } from '@/auth/server'
import { trackEvent } from '@/lib/track-event'
import { getSurvey } from '@/data/surveys'
import {
  listAllResponses,
  listResponsesForSurvey,
  getResponse,
  getResponseForRespondent,
  createResponse,
} from '@/data/survey-responses'

// Plain `z.string()`, not `.uuid()` — see the same note in `src/server/surveys.ts`.
const idInput = z.object({ id: z.string() })

const submitInputSchema = z.object({
  surveyId: z.string(),
  answers: z.record(z.string(), z.string()),
})

/**
 * Read access to individual/all responses is admin-only — this is exactly
 * the "who said what" view that must be role-gated (see README > Roles),
 * independent of the per-survey `anonymous` display flag, which only
 * controls whether respondent identity is *shown* once you're already
 * allowed to view a response.
 */
export const listResponsesServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole([appConfig.adminRole])
  return listAllResponses()
})

export const listResponsesForSurveyServer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole([appConfig.adminRole])
    return listResponsesForSurvey(data.id)
  })

export const getResponseServer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole([appConfig.adminRole])
    const response = await getResponse(data.id)
    if (!response) throw new Error('404: response not found')
    // Read-level audit trail (see README > Audit logging /
    // src/server/example-audited-getter.ts for the reference pattern) — an
    // individual, attributed survey response is exactly the "who viewed
    // whose answers" case that pattern anticipates.
    await auditRead('survey_response.viewed', 'survey_response', data.id)
    return response
  })

/** The current viewer's own response to a survey — `null` when they haven't responded yet. */
export const getMyResponseServer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    const user = await requireViewer()
    const response = await getResponseForRespondent(data.id, user.id)
    return response ?? null
  })

export const submitResponseServer = createServerFn({ method: 'POST' })
  .validator(submitInputSchema)
  .handler(async ({ data }) => {
    const user = await requireViewer()

    const survey = await getSurvey(data.surveyId)
    if (!survey) throw new Error('404: survey not found')
    if (survey.status !== 'active') {
      throw new Error('This survey is not currently accepting responses.')
    }

    // Guard against a tampered payload: every question must be answered
    // with a value valid for its own type.
    for (const question of survey.questions) {
      const answer = data.answers[question.id]?.trim()
      if (!answer) {
        throw new Error(`Missing an answer for "${question.text}".`)
      }
      if (question.type === 'multiple_choice' && !question.options?.includes(answer)) {
        throw new Error(`Invalid answer for "${question.text}".`)
      }
      if (question.type === 'rating') {
        const value = Number(answer)
        const scale = question.scale ?? 5
        if (!Number.isInteger(value) || value < 1 || value > scale) {
          throw new Error(`Invalid rating for "${question.text}".`)
        }
      }
    }

    const existing = await getResponseForRespondent(data.surveyId, user.id)
    if (existing) {
      throw new Error('You have already submitted a response to this survey.')
    }

    // Identity is always recorded (same as audit/events) — `survey.anonymous`
    // only controls whether the UI *displays* it, not whether it's stored.
    const response = await createResponse({
      surveyId: data.surveyId,
      respondentId: user.id,
      respondentEmail: user.email ?? null,
      answers: data.answers,
    })

    await audit('survey_response.created', 'survey_response', response.id, null, response)
    await trackEvent('survey_response_submitted', { surveyId: data.surveyId })
    return response
  })
