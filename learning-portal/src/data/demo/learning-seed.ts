import type { NewCourse, NewLesson, NewLessonProgress } from '@/db/schema'
import { appConfig } from '@/config/app'

/**
 * Single source of truth for the starter course catalog.
 *
 * - In demo mode, `src/data/courses.ts` / `src/data/progress.ts` load these
 *   arrays into memory.
 * - Against a real database, the `replace_starter_courses` migration inserts
 *   the same courses and lessons (generated from this file by
 *   `scripts/learning-seed-sql.ts`), and `npm run db:seed` re-inserts them
 *   idempotently. (An earlier, larger catalog used ids c(1)–c(7); that
 *   migration soft-deletes them, so never reuse those ids.)
 *
 * Fixed UUIDs keep both paths deterministic. Learner progress is demo-only —
 * a real deployment starts with no progress rows.
 */

type SeedCourse = NewCourse & { id: string }
type SeedLesson = NewLesson & { id: string }

const c = (n: number) => `22222222-2222-4222-8222-2222222222${String(n).padStart(2, '0')}`
const l = (course: number, n: number) =>
  `33333333-3333-4333-8333-3333333${String(course).padStart(2, '0')}${String(n).padStart(3, '0')}`

export const seedCourses: Array<SeedCourse> = [
  {
    id: c(8),
    title: 'Get to Know Acme Academy',
    summary: 'Learn more about our mission, values, and culture',
    description:
      'Start here. This course introduces who we are, what we stand for, and how we work together. Take your time with each lesson — understanding our culture will make everything else easier.',
    category: 'Company',
    icon: 'building',
    status: 'published',
    sortOrder: 1,
  },
  {
    id: c(9),
    title: 'Systems & Tools',
    summary: 'Set up your workspace and access essential tools',
    description:
      'Get your accounts, devices, and everyday tools set up securely so you can be productive from day one. If any access request is stuck for more than a day, contact the IT help desk.',
    category: 'Workspace',
    icon: 'laptop',
    status: 'published',
    sortOrder: 2,
  },
]

export const seedLessons: Array<SeedLesson> = [
  // 8 — Get to Know Acme Academy
  {
    id: l(8, 1),
    courseId: c(8),
    title: 'Our mission and values',
    description: 'Why we exist, the values that guide our decisions, and how they show up in everyday work.',
    resourceUrl: null,
    durationMinutes: 30,
    priority: 'high',
    required: true,
    sortOrder: 1,
  },
  {
    id: l(8, 2),
    courseId: c(8),
    title: 'Read the company handbook',
    description: 'Familiarize yourself with our policies, benefits overview, and code of conduct.',
    resourceUrl: null,
    durationMinutes: 120,
    priority: 'high',
    required: true,
    sortOrder: 2,
  },
  {
    id: l(8, 3),
    courseId: c(8),
    title: 'Org chart and leadership team',
    description: 'Learn how teams are organized, who leads each area, and where your role fits in.',
    resourceUrl: null,
    durationMinutes: 20,
    priority: 'medium',
    required: true,
    sortOrder: 3,
  },
  {
    id: l(8, 4),
    courseId: c(8),
    title: 'How we communicate',
    description:
      'Our norms for chat, email, and meetings — response times, async-first habits, and meeting etiquette.',
    resourceUrl: null,
    durationMinutes: 20,
    priority: 'medium',
    required: true,
    sortOrder: 4,
  },
  {
    id: l(8, 5),
    courseId: c(8),
    title: 'Schedule coffee chats with your team',
    description:
      'Book short intro calls with teammates and key partners to start building relationships early.',
    resourceUrl: null,
    durationMinutes: 60,
    priority: 'low',
    required: false,
    sortOrder: 5,
  },

  // 9 — Systems & Tools
  {
    id: l(9, 1),
    courseId: c(9),
    title: 'Set up your laptop',
    description:
      'Sign in, install system updates, and confirm disk encryption and screen lock are turned on.',
    resourceUrl: null,
    durationMinutes: 45,
    priority: 'high',
    required: true,
    sortOrder: 1,
  },
  {
    id: l(9, 2),
    courseId: c(9),
    title: 'Turn on multi-factor authentication',
    description:
      'Enable MFA on your work accounts and store your recovery codes in the company password manager.',
    resourceUrl: 'https://www.cisa.gov/MFA',
    durationMinutes: 15,
    priority: 'high',
    required: true,
    sortOrder: 2,
  },
  {
    id: l(9, 3),
    courseId: c(9),
    title: 'Email, calendar, and chat',
    description:
      'Set up your email signature, share your calendar working hours, and join your team’s chat channels.',
    resourceUrl: null,
    durationMinutes: 30,
    priority: 'high',
    required: true,
    sortOrder: 3,
  },
  {
    id: l(9, 4),
    courseId: c(9),
    title: 'Access the HR system (HRIS)',
    description:
      'Log in to the HR system, check your personal details, and add emergency contacts and direct deposit.',
    resourceUrl: null,
    durationMinutes: 20,
    priority: 'medium',
    required: true,
    sortOrder: 4,
  },
  {
    id: l(9, 5),
    courseId: c(9),
    title: 'Request access to team tools',
    description:
      'Ask your manager which shared drives, project boards, and apps your role needs, then submit access requests.',
    resourceUrl: null,
    durationMinutes: 20,
    priority: 'medium',
    required: true,
    sortOrder: 5,
  },
  {
    id: l(9, 6),
    courseId: c(9),
    title: 'Personalize your workspace',
    description:
      'Add a profile photo, set your notification preferences, and bookmark the tools you’ll use daily.',
    resourceUrl: null,
    durationMinutes: 15,
    priority: 'low',
    required: false,
    sortOrder: 6,
  },
]

/** The id `getAppContext()` assigns the built-in demo user. */
export const DEMO_LEARNER_ID = 'demo-user'

const demoLearners = [
  {
    userId: DEMO_LEARNER_ID,
    userEmail: appConfig.learning.demoUser.email,
    userName: appConfig.learning.demoUser.name,
  },
  { userId: 'demo-learner-jordan', userEmail: 'jordan.rivera@example.com', userName: 'Jordan Rivera' },
  { userId: 'demo-learner-priya', userEmail: 'priya.shah@example.com', userName: 'Priya Shah' },
  { userId: 'demo-learner-marcus', userEmail: 'marcus.lee@example.com', userName: 'Marcus Lee' },
  { userId: 'demo-learner-elena', userEmail: 'elena.torres@example.com', userName: 'Elena Torres' },
]

// [learner index, lesson id, day of September 2026 it was completed]
const demoCompletions: Array<[number, string, number]> = [
  [0, l(8, 1), 14],
  [0, l(8, 2), 15],
  [0, l(9, 1), 15],
  [1, l(8, 1), 2],
  [1, l(8, 2), 2],
  [1, l(8, 3), 3],
  [1, l(8, 4), 3],
  [1, l(8, 5), 9],
  [1, l(9, 1), 2],
  [1, l(9, 2), 2],
  [1, l(9, 3), 3],
  [2, l(8, 1), 5],
  [2, l(8, 2), 6],
  [2, l(9, 1), 5],
  [2, l(9, 2), 5],
  [2, l(9, 3), 6],
  [2, l(9, 4), 7],
  [2, l(9, 5), 8],
  [2, l(9, 6), 8],
  [3, l(9, 1), 12],
  [4, l(8, 1), 1],
  [4, l(8, 2), 1],
  [4, l(8, 3), 2],
  [4, l(8, 4), 2],
  [4, l(9, 1), 1],
  [4, l(9, 2), 1],
  [4, l(9, 3), 2],
  [4, l(9, 4), 4],
  [4, l(9, 5), 4],
]

export const seedLessonProgress: Array<NewLessonProgress & { id: string }> = demoCompletions.map(
  ([learner, lessonId, day], i) => ({
    id: `44444444-4444-4444-8444-${String(i + 1).padStart(12, '0')}`,
    ...demoLearners[learner],
    lessonId,
    completedAt: new Date(Date.UTC(2026, 8, day, 15)),
  }),
)
