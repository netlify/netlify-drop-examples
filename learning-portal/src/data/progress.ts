// Learner progress (lesson completions). Same demo/DB shape as
// `src/data/records.ts`. Unchecking a lesson clears `completedAt` instead of
// deleting the row.

import { randomUUID } from 'node:crypto'
import { and, eq, isNotNull } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { getDb } from '@/db/client'
import { lessonProgress, type LessonProgress, type NewLessonProgress } from '@/db/schema'
import { seedLessonProgress } from '@/data/demo/learning-seed'

export type Learner = { userId: string; userEmail: string | null; userName: string | null }

function toRow(input: NewLessonProgress & { id: string }): LessonProgress {
  return {
    id: input.id,
    userId: input.userId,
    userEmail: input.userEmail ?? null,
    userName: input.userName ?? null,
    lessonId: input.lessonId,
    completedAt: input.completedAt ?? null,
    updatedAt: new Date(),
  }
}

let demoProgress: Array<LessonProgress> = seedLessonProgress.map(toRow)

/** Completed lessons for one learner. */
export async function listCompletionsForUser(userId: string): Promise<Array<LessonProgress>> {
  if (isDemoMode()) {
    return demoProgress.filter((p) => p.userId === userId && p.completedAt !== null)
  }
  const db = getDb()
  return db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), isNotNull(lessonProgress.completedAt)))
}

/** Every completed lesson across all learners — feeds the team progress report. */
export async function listAllCompletions(): Promise<Array<LessonProgress>> {
  if (isDemoMode()) {
    return demoProgress.filter((p) => p.completedAt !== null)
  }
  const db = getDb()
  return db.select().from(lessonProgress).where(isNotNull(lessonProgress.completedAt))
}

/** Marks a lesson complete (or not) for a learner, creating the row on first touch. */
export async function setLessonCompletion(
  learner: Learner,
  lessonId: string,
  completed: boolean,
): Promise<LessonProgress> {
  const now = new Date()
  const completedAt = completed ? now : null

  if (isDemoMode()) {
    const index = demoProgress.findIndex((p) => p.userId === learner.userId && p.lessonId === lessonId)
    if (index === -1) {
      const row = toRow({ ...learner, lessonId, completedAt, id: randomUUID() })
      demoProgress = [...demoProgress, row]
      return row
    }
    const updated: LessonProgress = { ...demoProgress[index], ...learner, completedAt, updatedAt: now }
    demoProgress = [...demoProgress.slice(0, index), updated, ...demoProgress.slice(index + 1)]
    return updated
  }

  const db = getDb()
  const [row] = await db
    .insert(lessonProgress)
    .values({ ...learner, lessonId, completedAt, updatedAt: now })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { completedAt, updatedAt: now, userEmail: learner.userEmail, userName: learner.userName },
    })
    .returning()
  return row
}
