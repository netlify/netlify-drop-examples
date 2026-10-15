import { describe, it, expect } from 'vitest'

// Tests run without Netlify site metadata, so the data layer takes the
// in-memory branch here — no database needed.
import {
  listCourses,
  getCourse,
  createCourse,
  deleteCourse,
  listLessons,
  createLesson,
  deleteLesson,
} from './courses'
import { listCompletionsForUser, setLessonCompletion } from './progress'
import { seedCourses } from './demo/learning-seed'

const learner = { userId: 'test-learner', userEmail: 'test@example.com', userName: 'Test Learner' }

describe('courses (demo mode)', () => {
  it('lists only published courses by default', async () => {
    const published = await listCourses()
    expect(published.every((c) => c.status === 'published')).toBe(true)
    await createCourse({ title: 'Draft only', category: 'Test', status: 'draft' })
    const all = await listCourses({ includeDrafts: true })
    expect(published.length).toBe(seedCourses.filter((c) => c.status === 'published').length)
    expect(all.length).toBeGreaterThan(published.length)
  })

  it('orders courses by sortOrder', async () => {
    const all = await listCourses({ includeDrafts: true })
    const orders = all.map((c) => c.sortOrder)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('soft-deletes a course', async () => {
    const created = await createCourse({ title: 'Temp', category: 'Test', status: 'published' })
    const deleted = await deleteCourse(created.id)
    expect(deleted?.deletedAt).not.toBeNull()
    expect(await getCourse(created.id)).toBeUndefined()
  })

  it('creates and soft-deletes lessons within a course', async () => {
    const course = await createCourse({ title: 'With lessons', category: 'Test' })
    const lesson = await createLesson({ courseId: course.id, title: 'Lesson A', durationMinutes: 10 })
    expect(await listLessons([course.id])).toHaveLength(1)
    await deleteLesson(lesson.id)
    expect(await listLessons([course.id])).toHaveLength(0)
  })

  it('returns no lessons for an empty course id list', async () => {
    expect(await listLessons([])).toEqual([])
  })
})

describe('lesson progress (demo mode)', () => {
  it('marks a lesson complete, then reopens it without deleting the row', async () => {
    const [lesson] = await listLessons()
    const done = await setLessonCompletion(learner, lesson.id, true)
    expect(done.completedAt).not.toBeNull()
    expect((await listCompletionsForUser(learner.userId)).map((p) => p.lessonId)).toContain(lesson.id)

    const reopened = await setLessonCompletion(learner, lesson.id, false)
    expect(reopened.id).toBe(done.id)
    expect(reopened.completedAt).toBeNull()
    expect((await listCompletionsForUser(learner.userId)).map((p) => p.lessonId)).not.toContain(lesson.id)
  })
})
