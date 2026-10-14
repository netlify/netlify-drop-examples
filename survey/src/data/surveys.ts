// To point this app at another data source, edit this file only. Demo
// writes live in memory and reset on cold start.

import { randomUUID } from 'node:crypto'
import { eq, and, desc } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { getDb } from '@/db/client'
import { surveys, type SurveyRow, type NewSurvey } from '@/db/schema'
import { notDeleted, isNotDeleted } from '@/db/soft-delete'
import { seedSurveys } from '@/data/demo/seed'

export type SurveyInput = Omit<NewSurvey, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

function toRow(input: NewSurvey & { id: string }): SurveyRow {
  const now = new Date()
  return {
    id: input.id,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? 'draft',
    anonymous: input.anonymous ?? true,
    questions: input.questions,
    createdBy: input.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: input.deletedAt ?? null,
  }
}

// In-memory store for demo mode. Resets whenever the server cold-starts.
let demoSurveys: Array<SurveyRow> = seedSurveys.map(toRow)

function sortByCreatedDesc(rows: Array<SurveyRow>) {
  return [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function listSurveys(): Promise<Array<SurveyRow>> {
  if (isDemoMode()) {
    return sortByCreatedDesc(demoSurveys.filter(isNotDeleted))
  }
  const db = getDb()
  return db
    .select()
    .from(surveys)
    .where(notDeleted(surveys.deletedAt))
    .orderBy(desc(surveys.createdAt))
}

export async function getSurvey(id: string): Promise<SurveyRow | undefined> {
  if (isDemoMode()) {
    return demoSurveys.find((s) => s.id === id && isNotDeleted(s))
  }
  const db = getDb()
  const [row] = await db
    .select()
    .from(surveys)
    .where(and(eq(surveys.id, id), notDeleted(surveys.deletedAt)))
  return row
}

export async function createSurvey(input: SurveyInput): Promise<SurveyRow> {
  if (isDemoMode()) {
    const row = toRow({ ...input, id: randomUUID() })
    demoSurveys = [row, ...demoSurveys]
    return row
  }
  const db = getDb()
  const [row] = await db.insert(surveys).values(input).returning()
  return row
}

export async function updateSurvey(id: string, patch: Partial<SurveyInput>): Promise<SurveyRow | undefined> {
  if (isDemoMode()) {
    // Guard against resurrecting a soft-deleted row's fields via a direct
    // call that bypasses the (already-404ing) detail-page loader — matches
    // the DB branch's `notDeleted` condition below.
    const index = demoSurveys.findIndex((s) => s.id === id && isNotDeleted(s))
    if (index === -1) return undefined
    const updated: SurveyRow = { ...demoSurveys[index], ...patch, updatedAt: new Date() }
    demoSurveys = [...demoSurveys.slice(0, index), updated, ...demoSurveys.slice(index + 1)]
    return updated
  }
  const db = getDb()
  const [row] = await db
    .update(surveys)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(surveys.id, id), notDeleted(surveys.deletedAt)))
    .returning()
  return row
}

/**
 * Soft delete — marks the row `deletedAt` instead of removing it, so it's
 * recoverable (an operator can null out `deletedAt` by hand; there's no
 * restore UI). "Delete" never issues a real `DELETE`. Returns the updated
 * row (with `deletedAt` set) on success, or `undefined` if `id` doesn't
 * exist or is already soft-deleted.
 */
export async function deleteSurvey(id: string): Promise<SurveyRow | undefined> {
  if (isDemoMode()) {
    const index = demoSurveys.findIndex((s) => s.id === id && isNotDeleted(s))
    if (index === -1) return undefined
    const updated: SurveyRow = { ...demoSurveys[index], deletedAt: new Date() }
    demoSurveys = [...demoSurveys.slice(0, index), updated, ...demoSurveys.slice(index + 1)]
    return updated
  }
  const db = getDb()
  const [row] = await db
    .update(surveys)
    .set({ deletedAt: new Date() })
    .where(and(eq(surveys.id, id), notDeleted(surveys.deletedAt)))
    .returning()
  return row
}
