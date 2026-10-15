import type { NewRecord } from '@/db/schema'

/**
 * Single source of truth for demo/seed data.
 *
 * - In demo mode, `src/data/records.ts` loads this array into memory.
 * - Against a real database, `scripts/seed.ts` inserts these same rows via
 *   Drizzle.
 *
 * Fixed UUIDs keep both paths deterministic across restarts/reseeds. Rows
 * are typed as `NewRecord` (Drizzle's `$inferInsert` for the `records`
 * table) so demo data and the real schema can never silently drift apart.
 */
export const seedRecords: Array<NewRecord & { id: string }> = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    title: 'Renew office lease',
    status: 'active',
    owner: 'Priya Shah',
    amount: '4200.00',
    dueDate: '2026-09-15',
    notes: 'Landlord wants a decision before the 10th.',
  },
  {
    id: '11111111-1111-4111-8111-111111111102',
    title: 'Q3 marketing budget',
    status: 'draft',
    owner: 'Marcus Lee',
    amount: '18500.00',
    dueDate: '2026-09-30',
    notes: null,
  },
  {
    id: '11111111-1111-4111-8111-111111111103',
    title: 'Vendor contract: Acme Supplies',
    status: 'active',
    owner: 'Priya Shah',
    amount: '9800.50',
    dueDate: '2026-10-01',
    notes: 'Waiting on legal review.',
  },
  {
    id: '11111111-1111-4111-8111-111111111104',
    title: 'Annual audit prep',
    status: 'done',
    owner: 'Elena Torres',
    amount: '0.00',
    dueDate: '2026-08-20',
    notes: 'Completed ahead of schedule.',
  },
  {
    id: '11111111-1111-4111-8111-111111111105',
    title: 'Employee onboarding kit redesign',
    status: 'draft',
    owner: 'Marcus Lee',
    amount: '1200.00',
    dueDate: null,
    notes: null,
  },
  {
    id: '11111111-1111-4111-8111-111111111106',
    title: 'Server infrastructure upgrade',
    status: 'active',
    owner: 'Elena Torres',
    amount: '32000.00',
    dueDate: '2026-11-15',
    notes: 'Phase 1 of 3.',
  },
  {
    id: '11111111-1111-4111-8111-111111111107',
    title: 'Old CRM contract',
    status: 'archived',
    owner: 'Priya Shah',
    amount: '5400.00',
    dueDate: '2026-01-01',
    notes: 'Superseded by new vendor.',
  },
  {
    id: '11111111-1111-4111-8111-111111111108',
    title: 'Customer conference sponsorship',
    status: 'active',
    owner: 'Marcus Lee',
    amount: '7500.00',
    dueDate: '2026-09-25',
    notes: null,
  },
]
