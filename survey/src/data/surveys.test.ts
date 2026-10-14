import { describe, it, expect } from 'vitest'

// Tests run with no SITE_ID, so isDemoMode() is true and data/surveys.ts
// always takes the in-memory branch here — no database needed for tests.
import { listSurveys, getSurvey, createSurvey, updateSurvey, deleteSurvey } from './surveys'
import { seedSurveys } from './demo/seed'

describe('surveys (demo mode)', () => {
  it('lists the seeded surveys', async () => {
    const surveys = await listSurveys()
    expect(surveys.length).toBeGreaterThanOrEqual(seedSurveys.length)
  })

  it('gets a survey by id', async () => {
    const [first] = await listSurveys()
    const found = await getSurvey(first.id)
    expect(found?.id).toBe(first.id)
  })

  it('returns undefined for an unknown id', async () => {
    const found = await getSurvey('00000000-0000-0000-0000-000000000000')
    expect(found).toBeUndefined()
  })

  it('creates a survey with mixed question types and it appears in the list', async () => {
    const before = await listSurveys()
    const created = await createSurvey({
      title: 'New hire feedback',
      description: 'Collected after the first 30 days.',
      createdBy: 'admin@example.com',
      questions: [
        { id: 'q1', type: 'multiple_choice', text: 'How was onboarding?', options: ['Great', 'Okay', 'Poor'] },
        { id: 'q2', type: 'rating', text: 'Rate your manager support', scale: 5 },
        { id: 'q3', type: 'free_text', text: 'Anything else to share?' },
      ],
    })
    expect(created.id).toBeTruthy()
    expect(created.questions).toHaveLength(3)

    const after = await listSurveys()
    expect(after.length).toBe(before.length + 1)

    const found = await getSurvey(created.id)
    expect(found?.questions[1]).toMatchObject({ type: 'rating', scale: 5 })
  })

  it('defaults a new survey to draft/anonymous', async () => {
    const created = await createSurvey({
      title: 'Defaults check',
      questions: [{ id: 'q1', type: 'free_text', text: 'Anything?' }],
    })
    expect(created.status).toBe('draft')
    expect(created.anonymous).toBe(true)
  })

  it('updates a survey (e.g. publishing it)', async () => {
    const created = await createSurvey({
      title: 'To publish',
      status: 'draft',
      questions: [{ id: 'q1', type: 'free_text', text: 'Anything?' }],
    })
    const updated = await updateSurvey(created.id, { status: 'active' })
    expect(updated?.status).toBe('active')
    expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
  })

  it('returns undefined when updating an unknown id', async () => {
    const result = await updateSurvey('00000000-0000-0000-0000-000000000000', { status: 'active' })
    expect(result).toBeUndefined()
  })

  it('soft-deletes a survey', async () => {
    const created = await createSurvey({
      title: 'To delete',
      questions: [{ id: 'q1', type: 'free_text', text: 'Anything?' }],
    })
    const deleted = await deleteSurvey(created.id)
    expect(deleted?.deletedAt).not.toBeNull()

    // Soft-deleted rows are excluded from the default query, same as a
    // truly-missing id.
    const found = await getSurvey(created.id)
    expect(found).toBeUndefined()
  })

  it('returns undefined when deleting an unknown id', async () => {
    const deleted = await deleteSurvey('00000000-0000-0000-0000-000000000000')
    expect(deleted).toBeUndefined()
  })

  it('refuses to update a soft-deleted survey', async () => {
    const created = await createSurvey({
      title: 'To delete then edit',
      questions: [{ id: 'q1', type: 'free_text', text: 'Anything?' }],
    })
    await deleteSurvey(created.id)

    // The `notDeleted` guard on updateSurvey's WHERE clause (see
    // src/data/surveys.ts) means a soft-deleted row can't be silently
    // resurrected via an edit that bypasses the (already-404ing)
    // detail-page loader — the update matches zero rows, same as an
    // update against a genuinely unknown id.
    const result = await updateSurvey(created.id, { title: 'Should not apply' })
    expect(result).toBeUndefined()
  })
})
