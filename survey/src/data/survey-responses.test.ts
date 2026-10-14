import { describe, it, expect } from 'vitest'

// Tests run with no SITE_ID, so isDemoMode() is true and both data files
// below always take the in-memory branch here — no database needed.
import { createSurvey } from './surveys'
import {
  listAllResponses,
  listResponsesForSurvey,
  getResponse,
  getResponseForRespondent,
  createResponse,
} from './survey-responses'
import { seedSurveyResponses } from './demo/seed'

describe('survey responses (demo mode)', () => {
  it('lists the seeded responses', async () => {
    const responses = await listAllResponses()
    expect(responses.length).toBeGreaterThanOrEqual(seedSurveyResponses.length)
  })

  it('creates a response and it appears in the list for its survey', async () => {
    const survey = await createSurvey({
      title: 'Response test survey',
      status: 'active',
      questions: [{ id: 'q1', type: 'multiple_choice', text: 'Pick one', options: ['A', 'B'] }],
    })

    const before = await listResponsesForSurvey(survey.id)
    const created = await createResponse({
      surveyId: survey.id,
      respondentId: 'user-1',
      respondentEmail: 'user1@example.com',
      answers: { q1: 'A' },
    })
    expect(created.id).toBeTruthy()

    const after = await listResponsesForSurvey(survey.id)
    expect(after.length).toBe(before.length + 1)
  })

  it('gets a response by id', async () => {
    const [first] = await listAllResponses()
    const found = await getResponse(first.id)
    expect(found?.id).toBe(first.id)
  })

  it('returns undefined for an unknown response id', async () => {
    const found = await getResponse('00000000-0000-0000-0000-000000000000')
    expect(found).toBeUndefined()
  })

  it("finds a respondent's own response to a survey", async () => {
    const survey = await createSurvey({
      title: 'Respondent lookup test',
      status: 'active',
      questions: [{ id: 'q1', type: 'multiple_choice', text: 'Pick one', options: ['A', 'B'] }],
    })
    await createResponse({
      surveyId: survey.id,
      respondentId: 'user-2',
      respondentEmail: 'user2@example.com',
      answers: { q1: 'B' },
    })

    const mine = await getResponseForRespondent(survey.id, 'user-2')
    expect(mine?.respondentId).toBe('user-2')

    const someoneElses = await getResponseForRespondent(survey.id, 'user-3')
    expect(someoneElses).toBeUndefined()
  })

  it('returns undefined when there is no respondent id to match', async () => {
    const [{ surveyId }] = await listAllResponses()
    const result = await getResponseForRespondent(surveyId, null)
    expect(result).toBeUndefined()
  })
})
