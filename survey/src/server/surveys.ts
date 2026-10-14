import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireRole, audit } from '@/auth/server'
import { trackEvent } from '@/lib/track-event'
import { appConfig } from '@/config/app'
import { listSurveys, getSurvey, createSurvey, updateSurvey, deleteSurvey } from '@/data/surveys'

export const surveyStatusValues = ['draft', 'active', 'closed'] as const

export const questionTypeValues = ['multiple_choice', 'rating', 'free_text'] as const

/**
 * Per-question form shape is kept "wide" — every field present regardless
 * of `type` — so the TanStack Form array field backing `questions` doesn't
 * need a polymorphic row shape (every row is the same 4 fields; the UI just
 * shows/hides `options`/`scale` based on `type`). Only the fields relevant
 * to the chosen `type` are validated and kept once this transforms the
 * input into the shape stored in `surveys.questions` (see `db/schema.ts`'s
 * `Question`).
 */
export const questionInputSchema = z
  .object({
    id: z.string(),
    type: z.enum(questionTypeValues),
    text: z.string().trim().min(1, 'Question text is required').max(300),
    options: z.array(z.string().max(200)),
    scale: z.string(),
  })
  .superRefine((q, ctx) => {
    if (q.type === 'multiple_choice') {
      const nonEmpty = q.options.map((o) => o.trim()).filter(Boolean)
      if (nonEmpty.length < 2) {
        ctx.addIssue({ code: 'custom', message: 'Add at least 2 options', path: ['options'] })
      }
    }
  })
  .transform((q) => {
    if (q.type === 'multiple_choice') {
      return {
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options.map((o) => o.trim()).filter(Boolean),
      }
    }
    if (q.type === 'rating') {
      const scale = Number(q.scale)
      return { id: q.id, type: q.type, text: q.text, scale: Number.isFinite(scale) && scale > 0 ? scale : 5 }
    }
    return { id: q.id, type: q.type, text: q.text }
  })

/**
 * Shared Zod schema for the survey form (used by both the server function
 * below and the create route via TanStack Form's `validators.onSubmit`).
 */
export const surveyInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z
    .string()
    .max(2000)
    .transform((v) => (v ? v : null)),
  // Optional with a default, not required — the existing creation form
  // doesn't collect either yet; both are set/changed later from the survey
  // detail page (status transitions, the anonymous toggle).
  status: z.enum(surveyStatusValues).default('draft'),
  anonymous: z.boolean().default(true),
  questions: z.array(questionInputSchema).min(1, 'Add at least one question'),
})

export type SurveyFormValues = z.input<typeof surveyInputSchema>

// Plain `z.string()`, not `.uuid()` — a malformed id (e.g. from a mistyped
// URL) should fall through to the normal "survey not found" 404 below,
// rather than throwing a raw validation error for a different-looking
// failure than "unknown but well-formed id."
const idInput = z.object({ id: z.string() })

/**
 * createServerFn wrappers around `src/data/surveys.ts`. Every one of these
 * is admin-only for now — there's no respondent-facing "take a survey" flow
 * yet, only creation/management, so `requireRole([appConfig.adminRole])`
 * gates reads here too. This is the real authorization boundary, not the
 * `_app.tsx`/`_app/admin` route guards.
 */
export const listSurveysServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole([appConfig.adminRole])
  return listSurveys()
})

export const getSurveyServer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole([appConfig.adminRole])
    const survey = await getSurvey(data.id)
    if (!survey) throw new Error('404: survey not found')
    return survey
  })

export const createSurveyServer = createServerFn({ method: 'POST' })
  .validator(surveyInputSchema)
  .handler(async ({ data }) => {
    const user = await requireRole([appConfig.adminRole])
    const survey = await createSurvey({ ...data, createdBy: user?.email ?? null })
    await audit('survey.created', 'survey', survey.id, null, survey)
    await trackEvent('survey_created', { id: survey.id })
    return survey
  })

export const updateSurveyServer = createServerFn({ method: 'POST' })
  .validator(surveyInputSchema.partial().extend({ id: z.string() }))
  .handler(async ({ data }) => {
    await requireRole([appConfig.adminRole])
    const { id, ...patch } = data
    const before = await getSurvey(id)
    const survey = await updateSurvey(id, patch)
    if (!survey) throw new Error('404: survey not found')
    await audit('survey.updated', 'survey', id, before ?? null, survey)
    await trackEvent('survey_updated', { id })
    return survey
  })

export const deleteSurveyServer = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireRole([appConfig.adminRole])
    const before = await getSurvey(data.id)
    // Soft delete (see src/data/surveys.ts) — `deleted` is the row with
    // `deletedAt` now set, not `null`, since the row still exists.
    const deleted = await deleteSurvey(data.id)
    if (!deleted) throw new Error('404: survey not found')
    await audit('survey.deleted', 'survey', data.id, before ?? null, deleted)
    await trackEvent('survey_deleted', { id: data.id })
    return { id: data.id }
  })
