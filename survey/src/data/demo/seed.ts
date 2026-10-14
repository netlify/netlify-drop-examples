import type { NewSurvey, NewSurveyResponse } from '@/db/schema'

/**
 * Single source of truth for demo/seed data.
 *
 * - In demo mode, `src/data/surveys.ts` / `src/data/survey-responses.ts`
 *   load these arrays into memory.
 * - Against a real database, `scripts/seed.ts` inserts these same rows via
 *   Drizzle.
 *
 * Fixed UUIDs keep both paths deterministic across restarts/reseeds. Rows
 * are typed as `NewSurvey`/`NewSurveyResponse` (Drizzle's `$inferInsert` for
 * their respective tables) so demo data and the real schema can never
 * silently drift apart.
 */
export const seedSurveys: Array<NewSurvey & { id: string }> = [
  {
    id: '22222222-2222-4222-8222-222222222201',
    title: 'Quarterly engagement check-in',
    description: 'A short pulse survey on team morale and workload.',
    status: 'active',
    anonymous: true,
    createdBy: 'you@example.com',
    questions: [
      {
        id: '22222222-2222-4222-8222-222222222211',
        type: 'rating',
        text: 'How satisfied are you with your current workload?',
        scale: 5,
      },
      {
        id: '22222222-2222-4222-8222-222222222212',
        type: 'multiple_choice',
        text: 'Which best describes your work location this quarter?',
        options: ['Office', 'Remote', 'Hybrid'],
      },
      {
        id: '22222222-2222-4222-8222-222222222213',
        type: 'free_text',
        text: "What's one thing we could do to support you better?",
      },
    ],
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    title: 'Manager effectiveness survey',
    description: 'Draft — still being reviewed by People Ops before launch.',
    status: 'draft',
    anonymous: true,
    createdBy: 'you@example.com',
    questions: [
      {
        id: '22222222-2222-4222-8222-222222222221',
        type: 'rating',
        text: "How effectively does your manager communicate priorities?",
        scale: 5,
      },
    ],
  },
]

export const seedSurveyResponses: Array<NewSurveyResponse & { id: string }> = [
  {
    id: '33333333-3333-4333-8333-333333333301',
    surveyId: '22222222-2222-4222-8222-222222222201',
    respondentId: 'seed-priya',
    respondentEmail: 'priya.shah@example.com',
    answers: {
      '22222222-2222-4222-8222-222222222211': '4',
      '22222222-2222-4222-8222-222222222212': 'Hybrid',
      '22222222-2222-4222-8222-222222222213': 'More focus time in the mornings.',
    },
  },
  {
    id: '33333333-3333-4333-8333-333333333302',
    surveyId: '22222222-2222-4222-8222-222222222201',
    respondentId: 'seed-marcus',
    respondentEmail: 'marcus.lee@example.com',
    answers: {
      '22222222-2222-4222-8222-222222222211': '3',
      '22222222-2222-4222-8222-222222222212': 'Remote',
      '22222222-2222-4222-8222-222222222213': 'A faster laptop would help a lot.',
    },
  },
]
