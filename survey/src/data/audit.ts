// To point this app at another data source, edit this file only. Demo
// writes live in memory and reset on cold start.

import { randomUUID } from 'node:crypto'
import { desc } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { getDb } from '@/db/client'
import { auditLog, type AuditLogEntry, type NewAuditLogEntry } from '@/db/schema'

let demoAuditLog: Array<AuditLogEntry> = []

export async function insertAudit(input: Omit<NewAuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
  if (isDemoMode()) {
    const row: AuditLogEntry = {
      id: randomUUID(),
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      before: input.before ?? null,
      after: input.after ?? null,
      createdAt: new Date(),
    }
    demoAuditLog = [row, ...demoAuditLog]
    return row
  }
  const db = getDb()
  const [row] = await db.insert(auditLog).values(input).returning()
  return row
}

export async function listAudit(limit = 100): Promise<Array<AuditLogEntry>> {
  if (isDemoMode()) {
    return demoAuditLog.slice(0, limit)
  }
  const db = getDb()
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit)
}
