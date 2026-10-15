import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireRole, audit, auditRead } from '@/auth/server'
import { isDemoMode } from '@/config/flags'
import * as data from '@/data/recruiting'
import { trackEvent } from '@/lib/track-event'

const roles = ['recruiter', 'admin']
export const jobStatuses = ['open', 'closed'] as const
export const applicationStatuses = ['new', 'reviewing', 'interview', 'rejected', 'hired'] as const
export const jobSchema = z.object({
  title: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(100),
  location: z.string().trim().min(2).max(120),
  employmentType: z.string().trim().min(2).max(80),
  description: z.string().trim().min(20),
  responsibilities: z.string().trim().min(10),
  qualifications: z.string().trim().min(10),
  benefits: z.string().trim().min(10),
  status: z.enum(jobStatuses),
  postedDate: z.string().date(),
})
const idSchema = z.object({ id: z.string().uuid() })
const noteContent = z.string().trim().min(2).max(5000)
// Resumes uploaded through `/api/candidate-resume` (netlify/functions/candidate-resume.mts)
// all live under this prefix. Accepting any other key would let an applicant
// point recruiters at an unrelated file in the uploads store.
const RESUME_KEY_PREFIX = 'candidate-resumes/'
export const listPublicJobsServer = createServerFn({ method: 'GET' }).handler(() => data.listJobs(true))
export const getPublicJobServer = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data: input }) => {
    const job = await data.getJob(input.id, true)
    if (!job) throw new Error('404: job not found')
    return job
  })
export const submitApplicationServer = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      jobId: z.string().uuid(),
      candidateName: z.string().trim().min(2).max(120),
      email: z.email(),
      resumeKey: z.string().min(1),
      resumeName: z.string().min(1).max(200),
      coverLetter: z.string().trim().min(20).max(10000),
    }),
  )
  .handler(async ({ data: input }) => {
    if (!isDemoMode() && !input.resumeKey.startsWith(RESUME_KEY_PREFIX)) {
      throw new Error('Please upload your resume again.')
    }
    const job = await data.getJob(input.jobId, true)
    if (!job) throw new Error('This role is no longer accepting applications.')
    const application = await data.createApplication(input)
    await trackEvent('application_submitted', { id: application.id, jobId: application.jobId })
    await audit('application.created', 'application', application.id, null, {
      jobId: application.jobId,
      status: application.status,
    })
    return { id: application.id }
  })
export const listJobsServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole(roles)
  const [jobs, applications] = await Promise.all([data.listJobs(), data.listApplications()])
  return jobs.map((job) => ({
    ...job,
    applicationCount: applications.filter((a) => a.jobId === job.id).length,
  }))
})
export const getJobServer = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const [job, applications] = await Promise.all([data.getJob(input.id), data.listApplications(input.id)])
    if (!job) throw new Error('404: job not found')
    return { job, applications }
  })
export const createJobServer = createServerFn({ method: 'POST' })
  .validator(jobSchema)
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const job = await data.createJob(input)
    await trackEvent('job_created', { id: job.id })
    await audit('job.created', 'job', job.id, null, job)
    return job
  })
export const updateJobServer = createServerFn({ method: 'POST' })
  .validator(jobSchema.extend({ id: z.string().uuid() }))
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const { id, ...patch } = input
    const before = await data.getJob(id)
    const job = await data.updateJob(id, patch)
    if (!job) throw new Error('404: job not found')
    await trackEvent('job_updated', { id })
    await audit('job.updated', 'job', id, before, job)
    return job
  })
export const deleteJobServer = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const job = await data.deleteJob(input.id)
    if (!job) throw new Error('404: job not found')
    await trackEvent('job_deleted', { id: job.id })
    await audit('job.deleted', 'job', job.id, job, null)
    return { id: job.id }
  })
export const listApplicationsServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole(roles)
  const [applications, jobs] = await Promise.all([data.listApplications(), data.listJobs()])
  return applications.map((a) => ({
    ...a,
    jobTitle: jobs.find((j) => j.id === a.jobId)?.title ?? 'Unknown role',
  }))
})
export const getApplicationServer = createServerFn({ method: 'GET' })
  .validator(idSchema)
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const application = await data.getApplication(input.id)
    if (!application) throw new Error('404: application not found')
    const [job, notes] = await Promise.all([data.getJob(application.jobId), data.listNotes(application.id)])
    await auditRead('application.viewed', 'application', application.id)
    return { application, job, notes }
  })
export const updateApplicationStatusServer = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), status: z.enum(applicationStatuses) }))
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const before = await data.getApplication(input.id)
    const row = await data.updateApplication(input.id, input.status)
    if (!row) throw new Error('404: application not found')
    await trackEvent('application_status_changed', { id: row.id, status: row.status })
    await audit('application.updated', 'application', row.id, before, row)
    return row
  })
export const deleteApplicationServer = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const application = await data.deleteApplication(input.id)
    if (!application) throw new Error('404: application not found')
    await trackEvent('application_deleted', { id: application.id })
    await audit('application.deleted', 'application', application.id, application, null)
    return { id: application.id }
  })
export const addApplicationNoteServer = createServerFn({ method: 'POST' })
  .validator(z.object({ applicationId: z.string().uuid(), content: noteContent }))
  .handler(async ({ data: input }) => {
    const user = await requireRole(roles)
    if (!(await data.getApplication(input.applicationId))) throw new Error('404: application not found')
    const note = await data.addNote(
      input.applicationId,
      input.content,
      user?.name ?? user?.email ?? 'Demo recruiter',
    )
    await audit('application-note.created', 'application-note', note.id, null, note)
    return note
  })
export const updateApplicationNoteServer = createServerFn({ method: 'POST' })
  .validator(z.object({ id: z.string().uuid(), content: noteContent }))
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const before = await data.getNote(input.id)
    const note = await data.updateNote(input.id, input.content)
    if (!note) throw new Error('404: note not found')
    await audit('application-note.updated', 'application-note', note.id, before, note)
    return note
  })
export const deleteApplicationNoteServer = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(async ({ data: input }) => {
    await requireRole(roles)
    const note = await data.deleteNote(input.id)
    if (!note) throw new Error('404: note not found')
    await audit('application-note.deleted', 'application-note', note.id, note, null)
    return { id: note.id }
  })
