import { describe, expect, it } from 'vitest'
import { getJob, listApplications, listJobs, listNotes } from './recruiting'

describe('recruiting demo data', () => {
  it('provides a varied public job board while keeping closed roles internal', async () => {
    const allJobs = await listJobs()
    const publicJobs = await listJobs(true)

    expect(allJobs.length).toBeGreaterThanOrEqual(8)
    expect(publicJobs.length).toBeGreaterThanOrEqual(6)
    expect(publicJobs.every((job) => job.status === 'open')).toBe(true)
    expect(new Set(publicJobs.map((job) => job.department)).size).toBeGreaterThanOrEqual(4)
    const employmentTypes = new Set(publicJobs.map((job) => job.employmentType))
    expect(employmentTypes.has('Full-time')).toBe(true)
    expect(employmentTypes.has('Part-time')).toBe(true)
    expect(employmentTypes.has('Contract')).toBe(true)

    const closedJob = allJobs.find((job) => job.status === 'closed')
    expect(closedJob).toBeDefined()
    expect(await getJob(closedJob!.id, true)).toBeUndefined()
  })

  it('demonstrates every application status and realistic job activity', async () => {
    const applications = await listApplications()
    const statuses = new Set(applications.map((application) => application.status))

    expect(applications.length).toBeGreaterThanOrEqual(10)
    expect(statuses).toEqual(new Set(['new', 'reviewing', 'interview', 'rejected', 'hired']))
    expect(new Set(applications.map((application) => application.jobId)).size).toBeGreaterThanOrEqual(6)
  })

  it('includes private recruiter context from multiple authors', async () => {
    const applications = await listApplications()
    const noteGroups = await Promise.all(applications.map((application) => listNotes(application.id)))
    const notes = noteGroups.flat()

    expect(notes.length).toBeGreaterThanOrEqual(8)
    expect(new Set(notes.map((note) => note.author)).size).toBeGreaterThanOrEqual(3)
  })
})
