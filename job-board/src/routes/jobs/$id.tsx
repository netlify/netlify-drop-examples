import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, MapPin, UploadCloud } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from 'app-packs-ui'
import { getPublicJobServer, submitApplicationServer } from '@/server/recruiting'
import { useSubmission } from '@/lib/submission'
import { ErrorState, friendlyError } from '@/components/states/error-state'

export const Route = createFileRoute('/jobs/$id')({
  loader: ({ params }) => getPublicJobServer({ data: { id: params.id } }),
  component: JobDetail,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'this role')} />,
})
const lines = (s: string) => s.split('\n').filter(Boolean)
function JobDetail() {
  const job = Route.useLoaderData()
  const { demoMode } = Route.useRouteContext()
  const [done, setDone] = useState(false)
  const { state, run } = useSubmission(submitApplicationServer)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('resume') as File
    if (!file?.size) return
    let resumeKey = `demo/${file.name}`
    if (!demoMode) {
      const upload = new FormData()
      upload.set('file', file)
      const response = await fetch('/api/candidate-resume', { method: 'POST', body: upload })
      if (!response.ok) throw new Error('Resume upload failed. Please try again.')
      resumeKey = (await response.json()).key
    }
    await run({
      data: {
        jobId: job.id,
        candidateName: String(form.get('name')),
        email: String(form.get('email')),
        resumeKey,
        resumeName: file.name,
        coverLetter: String(form.get('coverLetter')),
      },
    })
    setDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  if (done)
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-6 text-3xl font-semibold">Application received</h1>
        <p className="mt-3 text-muted-foreground">
          Thanks for applying for {job.title}. Our recruiting team reviews every application and contacts
          selected candidates.
        </p>
        <Button asChild className="mt-8">
          <Link to="/">Browse more roles</Link>
        </Button>
      </div>
    )
  return (
    <div className="space-y-10">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All open roles
      </Link>
      <header className="max-w-4xl">
        <div className="flex flex-wrap gap-2">
          <Badge>{job.department}</Badge>
          <Badge variant="outline">{job.employmentType}</Badge>
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{job.title}</h1>
        <p className="mt-4 flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4" />
          {job.location} · Posted {new Date(`${job.postedDate}T12:00:00`).toLocaleDateString()}
        </p>
      </header>
      <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
        <article className="space-y-10">
          <Section title="About the role">
            <p className="leading-7 text-muted-foreground">{job.description}</p>
          </Section>
          <Section title="What you’ll do">
            <List text={job.responsibilities} />
          </Section>
          <Section title="What you bring">
            <List text={job.qualifications} />
          </Section>
          <Section title="What we offer">
            <List text={job.benefits} />
          </Section>
        </article>
        <aside>
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Apply for this role</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
                <label className="block text-sm font-medium">
                  Resume<span className="text-destructive"> *</span>
                  <span className="mt-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    <UploadCloud className="size-5" />
                    <input
                      name="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                      className="min-w-0 text-xs"
                    />
                  </span>
                </label>
                <label className="block text-sm font-medium">
                  Cover letter<span className="text-destructive"> *</span>
                  <textarea
                    name="coverLetter"
                    required
                    minLength={20}
                    rows={7}
                    className="mt-2 w-full rounded-md border bg-background p-3 text-sm"
                    placeholder="Tell us what draws you to this role."
                  />
                </label>
                {state.status === 'error' && (
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={state.status === 'submitting'}>
                  {state.status === 'submitting' ? 'Submitting…' : 'Submit application'}
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">
                  Your information is shared only with the recruiting team.
                </p>
              </form>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}
function List({ text }: { text: string }) {
  return (
    <ul className="space-y-3 text-muted-foreground">
      {lines(text).map((x) => (
        <li key={x} className="flex gap-3">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          {x}
        </li>
      ))}
    </ul>
  )
}
function Field(p: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = p
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="text-destructive"> *</span>
      <input {...rest} className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" />
    </label>
  )
}
