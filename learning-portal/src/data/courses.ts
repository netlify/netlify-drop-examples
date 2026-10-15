// Courses and lessons for the learning hub. Same shape as
// `src/data/records.ts`: demo branches inline, DB branches below them. Demo
// writes live in memory and reset on cold start.

import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { getDb } from '@/db/client'
import { courses, lessons, type Course, type NewCourse, type Lesson, type NewLesson } from '@/db/schema'
import { notDeleted, isNotDeleted } from '@/db/soft-delete'
import { seedCourses, seedLessons } from '@/data/demo/learning-seed'

export type CourseInput = Omit<NewCourse, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type LessonInput = Omit<NewLesson, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

function toCourseRow(input: NewCourse & { id: string }): Course {
  const now = new Date()
  return {
    id: input.id,
    title: input.title,
    summary: input.summary ?? '',
    description: input.description ?? null,
    category: input.category ?? 'General',
    icon: input.icon ?? 'book',
    status: input.status ?? 'draft',
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: input.deletedAt ?? null,
  }
}

function toLessonRow(input: NewLesson & { id: string }): Lesson {
  const now = new Date()
  return {
    id: input.id,
    courseId: input.courseId,
    title: input.title,
    description: input.description ?? null,
    resourceUrl: input.resourceUrl ?? null,
    durationMinutes: input.durationMinutes ?? 15,
    priority: input.priority ?? 'medium',
    required: input.required ?? true,
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: input.deletedAt ?? null,
  }
}

// In-memory stores for demo mode. Reset whenever the server cold-starts.
let demoCourses: Array<Course> = seedCourses.map(toCourseRow)
let demoLessons: Array<Lesson> = seedLessons.map(toLessonRow)

function bySortOrder<T extends { sortOrder: number; createdAt: Date }>(rows: Array<T>) {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
}

function replaceAt<T>(rows: Array<T>, index: number, row: T): Array<T> {
  return [...rows.slice(0, index), row, ...rows.slice(index + 1)]
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export async function listCourses({ includeDrafts = false } = {}): Promise<Array<Course>> {
  if (isDemoMode()) {
    return bySortOrder(
      demoCourses.filter((c) => isNotDeleted(c) && (includeDrafts || c.status === 'published')),
    )
  }
  const db = getDb()
  const conditions = [notDeleted(courses.deletedAt)]
  if (!includeDrafts) conditions.push(eq(courses.status, 'published'))
  return db
    .select()
    .from(courses)
    .where(and(...conditions))
    .orderBy(asc(courses.sortOrder), asc(courses.createdAt))
}

export async function getCourse(id: string): Promise<Course | undefined> {
  if (isDemoMode()) {
    return demoCourses.find((c) => c.id === id && isNotDeleted(c))
  }
  const db = getDb()
  const [row] = await db
    .select()
    .from(courses)
    .where(and(eq(courses.id, id), notDeleted(courses.deletedAt)))
  return row
}

export async function createCourse(input: CourseInput): Promise<Course> {
  if (isDemoMode()) {
    const row = toCourseRow({ ...input, id: randomUUID() })
    demoCourses = [...demoCourses, row]
    return row
  }
  const db = getDb()
  const [row] = await db.insert(courses).values(input).returning()
  return row
}

export async function updateCourse(id: string, patch: Partial<CourseInput>): Promise<Course | undefined> {
  if (isDemoMode()) {
    const index = demoCourses.findIndex((c) => c.id === id && isNotDeleted(c))
    if (index === -1) return undefined
    const updated: Course = { ...demoCourses[index], ...patch, updatedAt: new Date() }
    demoCourses = replaceAt(demoCourses, index, updated)
    return updated
  }
  const db = getDb()
  const [row] = await db
    .update(courses)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(courses.id, id), notDeleted(courses.deletedAt)))
    .returning()
  return row
}

/** Soft delete — sets `deletedAt`. Lessons stay attached and recoverable with it. */
export async function deleteCourse(id: string): Promise<Course | undefined> {
  if (isDemoMode()) {
    const index = demoCourses.findIndex((c) => c.id === id && isNotDeleted(c))
    if (index === -1) return undefined
    const updated: Course = { ...demoCourses[index], deletedAt: new Date() }
    demoCourses = replaceAt(demoCourses, index, updated)
    return updated
  }
  const db = getDb()
  const [row] = await db
    .update(courses)
    .set({ deletedAt: new Date() })
    .where(and(eq(courses.id, id), notDeleted(courses.deletedAt)))
    .returning()
  return row
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

/** Lessons for the given courses (all non-deleted lessons when `courseIds` is omitted). */
export async function listLessons(courseIds?: Array<string>): Promise<Array<Lesson>> {
  if (courseIds && courseIds.length === 0) return []
  if (isDemoMode()) {
    return bySortOrder(
      demoLessons.filter((l) => isNotDeleted(l) && (!courseIds || courseIds.includes(l.courseId))),
    )
  }
  const db = getDb()
  const conditions = [notDeleted(lessons.deletedAt)]
  if (courseIds) conditions.push(inArray(lessons.courseId, courseIds))
  return db
    .select()
    .from(lessons)
    .where(and(...conditions))
    .orderBy(asc(lessons.sortOrder), asc(lessons.createdAt))
}

export async function getLesson(id: string): Promise<Lesson | undefined> {
  if (isDemoMode()) {
    return demoLessons.find((l) => l.id === id && isNotDeleted(l))
  }
  const db = getDb()
  const [row] = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.id, id), notDeleted(lessons.deletedAt)))
  return row
}

export async function createLesson(input: LessonInput): Promise<Lesson> {
  if (isDemoMode()) {
    const row = toLessonRow({ ...input, id: randomUUID() })
    demoLessons = [...demoLessons, row]
    return row
  }
  const db = getDb()
  const [row] = await db.insert(lessons).values(input).returning()
  return row
}

export async function updateLesson(id: string, patch: Partial<LessonInput>): Promise<Lesson | undefined> {
  if (isDemoMode()) {
    const index = demoLessons.findIndex((l) => l.id === id && isNotDeleted(l))
    if (index === -1) return undefined
    const updated: Lesson = { ...demoLessons[index], ...patch, updatedAt: new Date() }
    demoLessons = replaceAt(demoLessons, index, updated)
    return updated
  }
  const db = getDb()
  const [row] = await db
    .update(lessons)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(lessons.id, id), notDeleted(lessons.deletedAt)))
    .returning()
  return row
}

/** Soft delete — sets `deletedAt`. Learner progress rows for the lesson are kept. */
export async function deleteLesson(id: string): Promise<Lesson | undefined> {
  if (isDemoMode()) {
    const index = demoLessons.findIndex((l) => l.id === id && isNotDeleted(l))
    if (index === -1) return undefined
    const updated: Lesson = { ...demoLessons[index], deletedAt: new Date() }
    demoLessons = replaceAt(demoLessons, index, updated)
    return updated
  }
  const db = getDb()
  const [row] = await db
    .update(lessons)
    .set({ deletedAt: new Date() })
    .where(and(eq(lessons.id, id), notDeleted(lessons.deletedAt)))
    .returning()
  return row
}
