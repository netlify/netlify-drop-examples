import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireUser, requireRole, audit, type SessionUser } from '@/auth/server'
import { isAuthEnabled, isDemoMode } from '@/config/flags'
import { appConfig } from '@/config/app'
import { trackEvent } from '@/lib/track-event'
import {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
} from '@/data/courses'
import {
  listCompletionsForUser,
  listAllCompletions,
  setLessonCompletion,
  type Learner,
} from '@/data/progress'
import { DEMO_LEARNER_ID } from '@/data/demo/learning-seed'
import type { Course, Lesson } from '@/db/schema'

export const courseStatusValues = ['draft', 'published'] as const
export const lessonPriorityValues = ['high', 'medium', 'low'] as const
// Keys of the icon map in `src/components/learning/course-icon.tsx`.
export const courseIconValues = [
  'book',
  'building',
  'laptop',
  'scale',
  'shield',
  'handshake',
  'users',
  'heart',
  'chart',
  'sparkles',
] as const

// Same convention as `recordInputSchema`: every INPUT is a plain string /
// boolean matching TanStack Form default values; coercion happens in the
// OUTPUT via `.transform`.
const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => (v.trim() ? v.trim() : null))

const intString = (label: string, min: number, max: number) =>
  z
    .string()
    .refine(
      (v) => /^\d+$/.test(v.trim()) && Number(v) >= min && Number(v) <= max,
      `${label} must be a whole number between ${min} and ${max}`,
    )
    .transform((v) => Number(v))

export const courseInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  summary: z.string().trim().max(300),
  description: optionalText(4000),
  category: z.string().trim().min(1, 'Category is required').max(80),
  icon: z.enum(courseIconValues),
  status: z.enum(courseStatusValues),
  sortOrder: intString('Order', 0, 9999),
})

export const lessonInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: optionalText(2000),
  resourceUrl: z
    .string()
    .trim()
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Enter a full link starting with https://')
    .transform((v) => (v ? v : null)),
  durationMinutes: intString('Duration', 1, 600),
  priority: z.enum(lessonPriorityValues),
  required: z.boolean(),
  sortOrder: intString('Order', 0, 9999),
})

export type CourseFormValues = z.input<typeof courseInputSchema>
export type LessonFormValues = z.input<typeof lessonInputSchema>

const idInput = z.object({ id: z.string().uuid() })

export type CourseSummary = Course & {
  lessonCount: number
  requiredCount: number
  completedCount: number
  totalMinutes: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Who progress is recorded against. Signed-in users use their Identity id;
 * demo mode uses the built-in demo user. A deployed site with Identity off
 * has no notion of "who", so everyone shares one anonymous progress record
 * until Identity is enabled (see README > Enable auth).
 */
function toLearner(user: SessionUser | null): Learner {
  if (user) return { userId: user.id, userEmail: user.email ?? null, userName: user.name ?? null }
  if (isDemoMode()) {
    const { email, name } = appConfig.learning.demoUser
    return { userId: DEMO_LEARNER_ID, userEmail: email, userName: name }
  }
  return { userId: 'anonymous', userEmail: null, userName: 'Anonymous learner' }
}

/** Mirrors `requireRole`'s semantics without throwing — auth off means everyone can manage. */
async function canManage(user: SessionUser | null): Promise<boolean> {
  if (!(await isAuthEnabled())) return true
  const roles = user?.roles ?? []
  return appConfig.learning.managerRoles.some((role) => roles.includes(role))
}

function requireManager() {
  return requireRole(appConfig.learning.managerRoles)
}

function summarize(
  courseList: Array<Course>,
  lessonList: Array<Lesson>,
  completed: Set<string>,
): Array<CourseSummary> {
  return courseList.map((course) => {
    const own = lessonList.filter((l) => l.courseId === course.id)
    return {
      ...course,
      lessonCount: own.length,
      requiredCount: own.filter((l) => l.required).length,
      completedCount: own.filter((l) => completed.has(l.id)).length,
      totalMinutes: own.reduce((sum, l) => sum + l.durationMinutes, 0),
    }
  })
}

// ---------------------------------------------------------------------------
// Learner-facing
// ---------------------------------------------------------------------------

/** Published courses with the current learner's progress on each. */
export const getLearnerOverviewServer = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await requireUser()
  const learner = toLearner(user)
  const courseList = await listCourses()
  const [lessonList, completions] = await Promise.all([
    listLessons(courseList.map((c) => c.id)),
    listCompletionsForUser(learner.userId),
  ])
  const completed = new Set(completions.map((p) => p.lessonId))
  return {
    learnerName: learner.userName ?? learner.userEmail ?? 'there',
    courses: summarize(courseList, lessonList, completed),
  }
})

export const getCourseDetailServer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const manager = await canManage(user)
    const course = await getCourse(data.id)
    // Drafts are invisible to learners — same 404 as a missing course.
    if (!course || (course.status !== 'published' && !manager)) throw new Error('404: course not found')
    const learner = toLearner(user)
    const [lessonList, completions] = await Promise.all([
      listLessons([course.id]),
      listCompletionsForUser(learner.userId),
    ])
    const lessonIds = new Set(lessonList.map((l) => l.id))
    return {
      course,
      lessons: lessonList,
      completedLessonIds: completions.map((p) => p.lessonId).filter((id) => lessonIds.has(id)),
      canManage: manager,
    }
  })

export const setLessonCompletionServer = createServerFn({ method: 'POST' })
  .validator(z.object({ lessonId: z.string().uuid(), completed: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await requireUser()
    const lesson = await getLesson(data.lessonId)
    const course = lesson ? await getCourse(lesson.courseId) : undefined
    if (!lesson || !course || (course.status !== 'published' && !(await canManage(user)))) {
      throw new Error('404: lesson not found')
    }
    const row = await setLessonCompletion(toLearner(user), lesson.id, data.completed)
    await audit(
      data.completed ? 'lesson-progress.completed' : 'lesson-progress.reopened',
      'lesson-progress',
      row.id,
      null,
      row,
    )
    await trackEvent(data.completed ? 'lesson_completed' : 'lesson_reopened', {
      lessonId: lesson.id,
      courseId: course.id,
    })
    return { lessonId: lesson.id, completed: row.completedAt !== null }
  })

// ---------------------------------------------------------------------------
// Course management (managerRoles only)
// ---------------------------------------------------------------------------

export const listManagedCoursesServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireManager()
  const courseList = await listCourses({ includeDrafts: true })
  const lessonList = await listLessons(courseList.map((c) => c.id))
  return summarize(courseList, lessonList, new Set())
})

export const getManagedCourseServer = createServerFn({ method: 'GET' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireManager()
    const course = await getCourse(data.id)
    if (!course) throw new Error('404: course not found')
    return { course, lessons: await listLessons([course.id]) }
  })

export const createCourseServer = createServerFn({ method: 'POST' })
  .validator(courseInputSchema)
  .handler(async ({ data }) => {
    await requireManager()
    const course = await createCourse(data)
    await audit('course.created', 'course', course.id, null, course)
    await trackEvent('course_created', { id: course.id })
    return course
  })

export const updateCourseServer = createServerFn({ method: 'POST' })
  .validator(courseInputSchema.partial().extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireManager()
    const { id, ...patch } = data
    const before = await getCourse(id)
    const course = await updateCourse(id, patch)
    if (!course) throw new Error('404: course not found')
    await audit('course.updated', 'course', id, before ?? null, course)
    return course
  })

export const deleteCourseServer = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireManager()
    const before = await getCourse(data.id)
    const deleted = await deleteCourse(data.id)
    if (!deleted) throw new Error('404: course not found')
    await audit('course.deleted', 'course', data.id, before ?? null, deleted)
    return { id: data.id }
  })

export const createLessonServer = createServerFn({ method: 'POST' })
  .validator(lessonInputSchema.extend({ courseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireManager()
    if (!(await getCourse(data.courseId))) throw new Error('404: course not found')
    const lesson = await createLesson(data)
    await audit('lesson.created', 'lesson', lesson.id, null, lesson)
    return lesson
  })

export const updateLessonServer = createServerFn({ method: 'POST' })
  .validator(lessonInputSchema.partial().extend({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireManager()
    const { id, ...patch } = data
    const before = await getLesson(id)
    const lesson = await updateLesson(id, patch)
    if (!lesson) throw new Error('404: lesson not found')
    await audit('lesson.updated', 'lesson', id, before ?? null, lesson)
    return lesson
  })

export const deleteLessonServer = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await requireManager()
    const before = await getLesson(data.id)
    const deleted = await deleteLesson(data.id)
    if (!deleted) throw new Error('404: lesson not found')
    await audit('lesson.deleted', 'lesson', data.id, before ?? null, deleted)
    return { id: data.id }
  })

// ---------------------------------------------------------------------------
// Team progress report (managerRoles only)
// ---------------------------------------------------------------------------

export type LearnerProgressRow = {
  userId: string
  name: string
  email: string | null
  completedCount: number
  requiredCompleted: number
  coursesCompleted: number
  perCourse: Array<{ courseId: string; completed: number }>
  lastActivity: Date
}

export const getTeamProgressServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireManager()
  const courseList = await listCourses()
  const [lessonList, completions] = await Promise.all([
    listLessons(courseList.map((c) => c.id)),
    listAllCompletions(),
  ])
  const lessonById = new Map(lessonList.map((l) => [l.id, l]))
  const summaries = summarize(courseList, lessonList, new Set())

  const byLearner = new Map<string, LearnerProgressRow>()
  for (const p of completions) {
    const lesson = lessonById.get(p.lessonId)
    if (!lesson || !p.completedAt) continue
    let row = byLearner.get(p.userId)
    if (!row) {
      row = {
        userId: p.userId,
        name: p.userName ?? p.userEmail ?? 'Unknown learner',
        email: p.userEmail,
        completedCount: 0,
        requiredCompleted: 0,
        coursesCompleted: 0,
        perCourse: courseList.map((c) => ({ courseId: c.id, completed: 0 })),
        lastActivity: p.completedAt,
      }
      byLearner.set(p.userId, row)
    }
    row.completedCount++
    if (lesson.required) row.requiredCompleted++
    const entry = row.perCourse.find((c) => c.courseId === lesson.courseId)
    if (entry) entry.completed++
    if (p.completedAt > row.lastActivity) row.lastActivity = p.completedAt
  }

  const learners = [...byLearner.values()]
  for (const row of learners) {
    row.coursesCompleted = row.perCourse.filter((entry) => {
      const course = summaries.find((c) => c.id === entry.courseId)
      return course && course.lessonCount > 0 && entry.completed >= course.lessonCount
    }).length
  }
  learners.sort((a, b) => b.completedCount - a.completedCount || a.name.localeCompare(b.name))

  return {
    courses: summaries.map((c) => ({ id: c.id, title: c.title, lessonCount: c.lessonCount })),
    totalLessons: lessonList.length,
    totalRequired: lessonList.filter((l) => l.required).length,
    learners,
  }
})
