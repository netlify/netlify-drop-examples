import { useState } from 'react'
import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft, FileText, Mail, MessageSquarePlus, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, toast } from 'app-packs-ui'
import {
  addApplicationNoteServer,
  applicationStatuses,
  deleteApplicationNoteServer,
  deleteApplicationServer,
  getApplicationServer,
  updateApplicationNoteServer,
  updateApplicationStatusServer,
} from '@/server/recruiting'
import type { ApplicationNote } from '@/db/schema'
import { ConfirmDelete } from '@/components/confirm-delete'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { useSubmission } from '@/lib/submission'
export const Route = createFileRoute('/_app/recruiting/applications/$id')({
  loader: ({ params }) => getApplicationServer({ data: { id: params.id } }),
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'this application')} />,
  component: ApplicationDetail,
})
function ApplicationDetail() {
  const { application, job, notes } = Route.useLoaderData()
  const { demoMode } = Route.useRouteContext()
  const router = useRouter()
  const nav = useNavigate()
  const [note, setNote] = useState('')
  const remove = useSubmission(deleteApplicationServer)
  const status = useSubmission(updateApplicationStatusServer)
  const add = useSubmission(addApplicationNoteServer)
  return (
    <div className="space-y-7">
      <Link to="/recruiting" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" />
        Hiring overview
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="outline">{application.status}</Badge>
          <h1 className="mt-3 text-3xl font-semibold">{application.candidateName}</h1>
          <p className="mt-1 text-muted-foreground">
            Applied for {job?.title ?? 'Unknown role'} on{' '}
            {new Date(application.submittedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium">
            Application status
            <select
              value={application.status}
              disabled={status.state.status === 'submitting'}
              onChange={async (e) => {
                await status.run({ data: { id: application.id, status: e.target.value as any } })
                toast({ title: 'Status updated' })
                router.invalidate()
              }}
              className="mt-2 block h-10 rounded-md border bg-background px-3"
            >
              {applicationStatuses.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <ConfirmDelete
            title="Delete this application?"
            description={`${application.candidateName}'s application and its internal notes come out of the pipeline. To keep a record of the decision, set the status to Rejected instead.`}
            disabled={remove.state.status === 'submitting'}
            onConfirm={async () => {
              try {
                await remove.run({ data: { id: application.id } })
                toast({ title: 'Application deleted' })
                // Drop data preloaded on hover so the overview doesn't show the deleted row.
                router.clearCache()
                nav({ to: '/recruiting' })
              } catch (error) {
                toast({
                  title: error instanceof Error ? error.message : 'Could not delete application',
                  variant: 'destructive',
                })
              }
            }}
          />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Candidate information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href={`mailto:${application.email}`}
                className="flex items-center gap-2 text-sm hover:underline"
              >
                <Mail className="size-4" />
                {application.email}
              </a>
              {demoMode ? (
                <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                  <FileText className="size-5" />
                  {application.resumeName}
                  <Badge variant="secondary">Demo file</Badge>
                </div>
              ) : (
                <Button asChild variant="outline">
                  <a
                    href={`/api/files/${encodeURIComponent(application.resumeKey)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText className="size-4" />
                    Open resume
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Cover letter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-7 text-muted-foreground">{application.coverLetter}</p>
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Internal notes</CardTitle>
            <p className="text-sm text-muted-foreground">Visible only to the recruiting team.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                await add.run({ data: { applicationId: application.id, content: note } })
                setNote('')
                toast({ title: 'Note added' })
                router.invalidate()
              }}
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                minLength={2}
                rows={4}
                className="w-full rounded-md border bg-background p-3 text-sm"
                placeholder="Add interview feedback or next steps…"
              />
              <Button type="submit" className="mt-2 w-full" disabled={add.state.status === 'submitting'}>
                <MessageSquarePlus className="size-4" />
                Add private note
              </Button>
            </form>
            <div className="space-y-3">
              {notes.length ? (
                notes.map((n) => <NoteItem key={n.id} note={n} onChange={() => router.invalidate()} />)
              ) : (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
function NoteItem({ note, onChange }: { note: ApplicationNote; onChange: () => void }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const save = useSubmission(updateApplicationNoteServer)
  const remove = useSubmission(deleteApplicationNoteServer)
  if (editing) {
    return (
      <form
        className="rounded-lg bg-muted p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          await save.run({ data: { id: note.id, content } })
          setEditing(false)
          toast({ title: 'Note updated' })
          onChange()
        }}
      >
        <textarea
          aria-label="Edit note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          minLength={2}
          rows={4}
          className="w-full rounded-md border bg-background p-3 text-sm"
        />
        <div className="mt-2 flex gap-2">
          <Button type="submit" size="small" disabled={save.state.status === 'submitting'}>
            Save
          </Button>
          <Button
            type="button"
            size="small"
            variant="ghost"
            onClick={() => {
              setContent(note.content)
              setEditing(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    )
  }
  return (
    <div className="group rounded-lg bg-muted p-4">
      <p className="whitespace-pre-wrap text-sm leading-6">{note.content}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {note.author} · {new Date(note.createdAt).toLocaleString()}
          {note.updatedAt ? ' · edited' : ''}
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Edit note" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
          </Button>
          <ConfirmDelete
            title="Delete this note?"
            description="The note is removed for everyone on the recruiting team."
            disabled={remove.state.status === 'submitting'}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Delete note">
                <Trash2 className="size-3.5" />
              </Button>
            }
            onConfirm={async () => {
              await remove.run({ data: { id: note.id } })
              toast({ title: 'Note deleted' })
              onChange()
            }}
          />
        </div>
      </div>
    </div>
  )
}
