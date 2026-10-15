import { describe, expect, it } from 'vitest'
import {
  addNote,
  deleteApplication,
  deleteJob,
  deleteNote,
  getApplication,
  getJob,
  getNote,
  listApplications,
  listJobs,
  listNotes,
  updateApplication,
  updateJob,
  updateNote,
} from './recruiting'

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

// These mutate the in-memory demo data, so they run after the read-only checks
// above and each picks rows the others don't touch.
describe('recruiting CRUD (demo mode)', () => {
  it('deletes a job along with its applications and their notes', async () => {
    const job = (await listJobs()).find((j) => j.title === 'Senior Product Designer')!
    const jobApplications = await listApplications(job.id)
    expect(jobApplications.length).toBeGreaterThan(0)
    const noteIds = (await Promise.all(jobApplications.map((a) => listNotes(a.id)))).flat().map((n) => n.id)
    expect(noteIds.length).toBeGreaterThan(0)

    expect((await deleteJob(job.id))?.id).toBe(job.id)

    expect(await getJob(job.id)).toBeUndefined()
    expect(await listApplications(job.id)).toEqual([])
    for (const a of jobApplications) expect(await getApplication(a.id)).toBeUndefined()
    for (const id of noteIds) expect(await getNote(id)).toBeUndefined()
    expect(await updateJob(job.id, { title: 'Too late' })).toBeUndefined()
    expect(await deleteJob(job.id)).toBeUndefined()
  })

  it('deletes an application and its notes, and refuses to update it afterwards', async () => {
    const application = (await listApplications()).find((a) => a.candidateName === 'Jonas Berg')!
    const [note] = await listNotes(application.id)
    expect(note).toBeDefined()

    expect((await deleteApplication(application.id))?.id).toBe(application.id)

    expect(await getApplication(application.id)).toBeUndefined()
    expect(await getNote(note.id)).toBeUndefined()
    expect(await updateApplication(application.id, 'hired')).toBeUndefined()
    expect(await deleteApplication(application.id)).toBeUndefined()
  })

  it('edits and deletes a note', async () => {
    const application = (await listApplications()).find((a) => a.candidateName === 'Anika Patel')!
    const note = await addNote(application.id, 'Phone screen booked.', 'Sam Rivera')
    expect(note.updatedAt).toBeNull()

    const edited = await updateNote(note.id, 'Phone screen booked for Tuesday.')
    expect(edited?.content).toBe('Phone screen booked for Tuesday.')
    expect(edited?.updatedAt).toBeInstanceOf(Date)

    expect((await deleteNote(note.id))?.id).toBe(note.id)
    expect(await listNotes(application.id)).not.toContainEqual(expect.objectContaining({ id: note.id }))
    expect(await updateNote(note.id, 'Too late')).toBeUndefined()
  })
})
