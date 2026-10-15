import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BriefcaseBusiness, Plus, Search, Users } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from 'app-packs-ui'
import { listJobsServer, listApplicationsServer } from '@/server/recruiting'
import { ErrorState } from '@/components/states/error-state'
export const Route = createFileRoute('/_app/recruiting/')({
  loader: async () => {
    const [jobs, applications] = await Promise.all([listJobsServer(), listApplicationsServer()])
    return { jobs, applications }
  },
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : 'Failed to load recruiting'} />
  ),
  component: Recruiting,
})
function Recruiting() {
  const { jobs, applications } = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const shown = jobs.filter(
    (j) =>
      (status === 'all' || j.status === status) &&
      `${j.title} ${j.department} ${j.location}`.toLowerCase().includes(query.toLowerCase()),
  )
  const open = jobs.filter((j) => j.status === 'open').length
  const active = applications.filter((a) => !['rejected', 'hired'].includes(a.status)).length
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Recruiter workspace</p>
          <h1 className="mt-2 text-3xl font-semibold">Hiring overview</h1>
          <p className="text-muted-foreground">Manage roles and move promising candidates forward.</p>
        </div>
        <Button asChild>
          <Link to="/recruiting/jobs/new">
            <Plus className="size-4" />
            Create job
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Open jobs" value={open} icon={<BriefcaseBusiness />} />
        <Metric label="Total candidates" value={applications.length} icon={<Users />} />
        <Metric label="Active pipeline" value={active} icon={<Users />} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Jobs</CardTitle>
            <div className="mt-3 flex gap-2">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input
                  aria-label="Search jobs"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search jobs"
                  className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
                />
              </label>
              <select
                aria-label="Filter job status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {jobs.length
                  ? 'No jobs match your search.'
                  : 'No jobs yet. Create one to open your first role.'}
              </p>
            ) : null}
            {shown.map((job) => (
              <Link
                key={job.id}
                to="/recruiting/jobs/$id"
                params={{ id: job.id }}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.department} · {job.location}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{job.applicationCount} applicants</span>
                  <Badge variant={job.status === 'open' ? 'primary' : 'secondary'}>{job.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {applications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            ) : null}
            {applications.map((a) => (
              <Link
                key={a.id}
                to="/recruiting/applications/$id"
                params={{ id: a.id }}
                className="block rounded-lg border p-4 hover:bg-muted/50"
              >
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{a.candidateName}</p>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.jobTitle}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(a.submittedAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold">{value}</p>
        </div>
        <span className="text-muted-foreground [&>svg]:size-5">{icon}</span>
      </CardContent>
    </Card>
  )
}
