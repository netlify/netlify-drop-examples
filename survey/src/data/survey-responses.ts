// To point this app at another data source, edit this file only. Demo
// writes live in memory and reset on cold start.

import { randomUUID } from 'node:crypto'
import { eq, desc } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { getDb } from '@/db/client'
import { surveyResponses, type SurveyResponseRow, type NewSurveyResponse } from '@/db/schema'
import { seedSurveyResponses } from '@/data/demo/seed'

export type SurveyResponseInput = Omit<NewSurveyResponse, 'id' | 'createdAt' | 'submittedAt'>

function toRow(input: NewSurveyResponse & { id: string }): SurveyResponseRow {
  return {
    id: input.id,
    surveyId: input.surveyId,
    respondentId: input.respondentId ?? null,
    respondentEmail: input.respondentEmail ?? null,
    answers: input.answers,
    submittedAt: new Date(),
    createdAt: new Date(),
  }
}

// In-memory store for demo mode. Resets whenever the server cold-starts.
let demoResponses: Array<SurveyResponseRow> = seedSurveyResponses.map(toRow)

function sortBySubmittedDesc(rows: Array<SurveyResponseRow>) {
  return [...rows].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
}

// DB-mode rows come back with `answers: Json` (see src/db/schema.ts's
// `$type<Json>()` note) — this app only ever writes `Record<string, string>`
// into that column, so it's safe to narrow back to `SurveyResponseRow` at
// the one seam where rows leave the database.
function fromDbRow(row: typeof surveyResponses.$inferSelect): SurveyResponseRow {
  return row as unknown as SurveyResponseRow
}

export async function listAllResponses(): Promise<Array<SurveyResponseRow>> {
  if (isDemoMode()) {
    return sortBySubmittedDesc(demoResponses)
  }
  const db = getDb()
  const rows = await db.select().from(surveyResponses).orderBy(desc(surveyResponses.submittedAt))
  return rows.map(fromDbRow)
}

export async function listResponsesForSurvey(surveyId: string): Promise<Array<SurveyResponseRow>> {
  if (isDemoMode()) {
    return sortBySubmittedDesc(demoResponses.filter((r) => r.surveyId === surveyId))
  }
  const db = getDb()
  const rows = await db
    .select()
    .from(surveyResponses)
    .where(eq(surveyResponses.surveyId, surveyId))
    .orderBy(desc(surveyResponses.submittedAt))
  return rows.map(fromDbRow)
}

export async function getResponse(id: string): Promise<SurveyResponseRow | undefined> {
  if (isDemoMode()) {
    return demoResponses.find((r) => r.id === id)
  }
  const db = getDb()
  const [row] = await db.select().from(surveyResponses).where(eq(surveyResponses.id, id))
  return row ? fromDbRow(row) : undefined
}

/**
 * The respondent's own response to a survey, if they've already submitted
 * one — used to render "already submitted" instead of the take-survey CTA.
 */
export async function getResponseForRespondent(
  surveyId: string,
  respondentId: string | null,
): Promise<SurveyResponseRow | undefined> {
  if (!respondentId) return undefined
  const responses = await listResponsesForSurvey(surveyId)
  return responses.find((r) => r.respondentId === respondentId)
}

export async function createResponse(input: SurveyResponseInput): Promise<SurveyResponseRow> {
  if (isDemoMode()) {
    const row = toRow({ ...input, id: randomUUID() })
    demoResponses = [row, ...demoResponses]
    return row
  }
  const db = getDb()
  const [row] = await db.insert(surveyResponses).values(input).returning()
  return fromDbRow(row)
}
