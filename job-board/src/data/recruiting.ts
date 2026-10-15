import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { isDemoMode } from '@/config/flags'
import { getDb } from '@/db/client'
import {
  jobs,
  applications,
  applicationNotes,
  type Job,
  type Application,
  type ApplicationNote,
  type NewJob,
  type NewApplication,
} from '@/db/schema'
import { notDeleted, isNotDeleted } from '@/db/soft-delete'
import { seedApplications, seedJobs, seedNotes } from '@/data/demo/recruiting'

// Demo mode keeps its own copies so edits never mutate the shared seed rows.
let demoJobs: Job[] = seedJobs.map((row) => ({ ...row }))
let demoApplications: Application[] = seedApplications.map((row) => ({ ...row }))
let demoNotes: ApplicationNote[] = seedNotes.map((row) => ({ ...row }))

export type JobInput = Omit<NewJob, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type ApplicationInput = Omit<
  NewApplication,
  'id' | 'submittedAt' | 'updatedAt' | 'deletedAt' | 'status'
>

// --- Jobs --------------------------------------------------------------------

export async function listJobs(publicOnly = false) {
  if (isDemoMode()) return demoJobs.filter((j) => isNotDeleted(j) && (!publicOnly || j.status === 'open'))
  const db = getDb()
  return db
    .select()
    .from(jobs)
    .where(publicOnly ? and(notDeleted(jobs.deletedAt), eq(jobs.status, 'open')) : notDeleted(jobs.deletedAt))
    .orderBy(desc(jobs.postedDate))
}

export async function getJob(id: string, publicOnly = false) {
  if (isDemoMode())
    return demoJobs.find((j) => j.id === id && isNotDeleted(j) && (!publicOnly || j.status === 'open'))
  const db = getDb()
  const [row] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, id), notDeleted(jobs.deletedAt), ...(publicOnly ? [eq(jobs.status, 'open')] : [])))
  return row
}

export async function createJob(input: JobInput) {
  if (isDemoMode()) {
    const row = {
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as Job
    demoJobs = [row, ...demoJobs]
    return row
  }
  const [row] = await getDb().insert(jobs).values(input).returning()
  return row
}

export async function updateJob(id: string, patch: Partial<JobInput>) {
  if (isDemoMode()) {
    const i = demoJobs.findIndex((j) => j.id === id && isNotDeleted(j))
    if (i < 0) return
    demoJobs[i] = { ...demoJobs[i], ...patch, updatedAt: new Date() }
    return demoJobs[i]
  }
  const [row] = await getDb()
    .update(jobs)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(jobs.id, id), notDeleted(jobs.deletedAt)))
    .returning()
  return row
}

/**
 * Soft-deletes a job along with its applications and their notes, so a
 * deleted role never leaves orphaned candidates in the pipeline. Resumes stay
 * in Blobs. Returns the deleted job, or `undefined` if it didn't exist.
 */
export async function deleteJob(id: string) {
  const deletedAt = new Date()
  if (isDemoMode()) {
    const job = demoJobs.find((j) => j.id === id && isNotDeleted(j))
    if (!job) return
    job.deletedAt = deletedAt
    for (const application of demoApplications) {
      if (application.jobId === id && isNotDeleted(application))
        softDeleteDemoApplication(application, deletedAt)
    }
    return job
  }
  return getDb().transaction(async (tx) => {
    const [job] = await tx
      .update(jobs)
      .set({ deletedAt })
      .where(and(eq(jobs.id, id), notDeleted(jobs.deletedAt)))
      .returning()
    if (!job) return
    const removed = await tx
      .update(applications)
      .set({ deletedAt })
      .where(and(eq(applications.jobId, id), notDeleted(applications.deletedAt)))
      .returning({ id: applications.id })
    if (removed.length) {
      await tx
        .update(applicationNotes)
        .set({ deletedAt })
        .where(
          and(
            inArray(
              applicationNotes.applicationId,
              removed.map((a) => a.id),
            ),
            notDeleted(applicationNotes.deletedAt),
          ),
        )
    }
    return job
  })
}

// --- Applications ------------------------------------------------------------

export async function createApplication(input: ApplicationInput) {
  if (isDemoMode()) {
    const row = {
      ...input,
      id: randomUUID(),
      status: 'new',
      submittedAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as Application
    demoApplications = [row, ...demoApplications]
    return row
  }
  const [row] = await getDb().insert(applications).values(input).returning()
  return row
}

export async function listApplications(jobId?: string) {
  if (isDemoMode()) return demoApplications.filter((a) => isNotDeleted(a) && (!jobId || a.jobId === jobId))
  return getDb()
    .select()
    .from(applications)
    .where(
      jobId
        ? and(eq(applications.jobId, jobId), notDeleted(applications.deletedAt))
        : notDeleted(applications.deletedAt),
    )
    .orderBy(desc(applications.submittedAt))
}

export async function getApplication(id: string) {
  if (isDemoMode()) return demoApplications.find((a) => a.id === id && isNotDeleted(a))
  const [row] = await getDb()
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), notDeleted(applications.deletedAt)))
  return row
}

export async function updateApplication(id: string, status: string) {
  if (isDemoMode()) {
    const i = demoApplications.findIndex((a) => a.id === id && isNotDeleted(a))
    if (i < 0) return
    demoApplications[i] = { ...demoApplications[i], status, updatedAt: new Date() }
    return demoApplications[i]
  }
  const [row] = await getDb()
    .update(applications)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(applications.id, id), notDeleted(applications.deletedAt)))
    .returning()
  return row
}

/** Soft-deletes an application and its notes. The resume stays in Blobs. */
export async function deleteApplication(id: string) {
  const deletedAt = new Date()
  if (isDemoMode()) {
    const application = demoApplications.find((a) => a.id === id && isNotDeleted(a))
    if (!application) return
    softDeleteDemoApplication(application, deletedAt)
    return application
  }
  return getDb().transaction(async (tx) => {
    const [application] = await tx
      .update(applications)
      .set({ deletedAt })
      .where(and(eq(applications.id, id), notDeleted(applications.deletedAt)))
      .returning()
    if (!application) return
    await tx
      .update(applicationNotes)
      .set({ deletedAt })
      .where(and(eq(applicationNotes.applicationId, id), notDeleted(applicationNotes.deletedAt)))
    return application
  })
}

function softDeleteDemoApplication(application: Application, deletedAt: Date) {
  application.deletedAt = deletedAt
  for (const note of demoNotes) {
    if (note.applicationId === application.id && isNotDeleted(note)) note.deletedAt = deletedAt
  }
}

// --- Notes -------------------------------------------------------------------

export async function listNotes(applicationId: string) {
  if (isDemoMode()) return demoNotes.filter((n) => n.applicationId === applicationId && isNotDeleted(n))
  return getDb()
    .select()
    .from(applicationNotes)
    .where(and(eq(applicationNotes.applicationId, applicationId), notDeleted(applicationNotes.deletedAt)))
    .orderBy(desc(applicationNotes.createdAt))
}

export async function getNote(id: string) {
  if (isDemoMode()) return demoNotes.find((n) => n.id === id && isNotDeleted(n))
  const [row] = await getDb()
    .select()
    .from(applicationNotes)
    .where(and(eq(applicationNotes.id, id), notDeleted(applicationNotes.deletedAt)))
  return row
}

export async function addNote(applicationId: string, content: string, author: string) {
  if (isDemoMode()) {
    const row: ApplicationNote = {
      id: randomUUID(),
      applicationId,
      content,
      author,
      createdAt: new Date(),
      updatedAt: null,
      deletedAt: null,
    }
    demoNotes = [row, ...demoNotes]
    return row
  }
  const [row] = await getDb().insert(applicationNotes).values({ applicationId, content, author }).returning()
  return row
}

export async function updateNote(id: string, content: string) {
  if (isDemoMode()) {
    const i = demoNotes.findIndex((n) => n.id === id && isNotDeleted(n))
    if (i < 0) return
    demoNotes[i] = { ...demoNotes[i], content, updatedAt: new Date() }
    return demoNotes[i]
  }
  const [row] = await getDb()
    .update(applicationNotes)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(applicationNotes.id, id), notDeleted(applicationNotes.deletedAt)))
    .returning()
  return row
}

export async function deleteNote(id: string) {
  if (isDemoMode()) {
    const note = demoNotes.find((n) => n.id === id && isNotDeleted(n))
    if (!note) return
    note.deletedAt = new Date()
    return note
  }
  const [row] = await getDb()
    .update(applicationNotes)
    .set({ deletedAt: new Date() })
    .where(and(eq(applicationNotes.id, id), notDeleted(applicationNotes.deletedAt)))
    .returning()
  return row
}
