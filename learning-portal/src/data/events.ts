// To point this app at another data source, edit this file only. Demo
// writes live in memory and reset on cold start.

import { randomUUID } from 'node:crypto'
import { desc } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { getDb } from '@/db/client'
import { events, type Event, type NewEvent } from '@/db/schema'

let demoEvents: Array<Event> = []

const MAX_DEMO_EVENTS = 500

export async function insertEvent(input: Omit<NewEvent, 'id' | 'createdAt'>): Promise<Event> {
  if (isDemoMode()) {
    const row: Event = {
      id: randomUUID(),
      name: input.name,
      path: input.path ?? null,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      props: input.props ?? null,
      createdAt: new Date(),
    }
    demoEvents = [row, ...demoEvents].slice(0, MAX_DEMO_EVENTS)
    return row
  }
  const db = getDb()
  const [row] = await db.insert(events).values(input).returning()
  return row
}

export async function listEvents(limit = 100): Promise<Array<Event>> {
  if (isDemoMode()) {
    return demoEvents.slice(0, limit)
  }
  const db = getDb()
  return db.select().from(events).orderBy(desc(events.createdAt)).limit(limit)
}
