import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, BriefcaseBusiness, Building2, MapPin, Search } from 'lucide-react'
import { Badge, Card, CardContent, EmptyState } from 'app-packs-ui'
import { listPublicJobsServer } from '@/server/recruiting'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { appConfig } from '@/config/app'

export const Route = createFileRoute('/')({
  loader: () => listPublicJobsServer(),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'open roles')} />,
  component: JobBoard,
})
function JobBoard() {
  const jobs = Route.useLoaderData()
  const [q, setQ] = useState('')
  const [department, setDepartment] = useState('all')
  const [location, setLocation] = useState('all')
  const [type, setType] = useState('all')
  const options = (key: 'department' | 'location' | 'employmentType') =>
    [...new Set(jobs.map((j) => j[key]))].sort()
  const shown = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (!q || `${j.title} ${j.department} ${j.location}`.toLowerCase().includes(q.toLowerCase())) &&
          (department === 'all' || j.department === department) &&
          (location === 'all' || j.location === location) &&
          (type === 'all' || j.employmentType === type),
      ),
    [jobs, q, department, location, type],
  )
  return (
    <div className="space-y-10">
      <section className="job-hero -mx-4 -mt-8 px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.2em] text-primary">
            Careers at {appConfig.productName}
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Do work that leaves things better than you found them.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Join a thoughtful, ambitious team building tools that help people make progress together.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm">
            <BriefcaseBusiness className="size-4" />
            <span>
              {jobs.length} open roles across {options('department').length} teams
            </span>
          </div>
        </div>
      </section>
      <section className="space-y-6">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Open roles</h2>
          <p className="mt-1 text-muted-foreground">Find the right next chapter.</p>
        </div>
        <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <label className="relative">
            <span className="sr-only">Search jobs</span>
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search roles"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
            />
          </label>
          {[
            ['Department', department, setDepartment, options('department')],
            ['Location', location, setLocation, options('location')],
            ['Employment type', type, setType, options('employmentType')],
          ].map(([label, value, setter, items]) => (
            <select
              key={label as string}
              aria-label={label as string}
              value={value as string}
              onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All {String(label).toLowerCase()}s</option>
              {(items as string[]).map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          ))}
        </div>
        <div className="space-y-3">
          {shown.map((job) => (
            <Link key={job.id} to="/jobs/$id" params={{ id: job.id }} className="group block">
              <Card className="transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">{job.department}</Badge>
                      <Badge variant="outline">{job.employmentType}</Badge>
                    </div>
                    <h3 className="text-xl font-semibold group-hover:text-primary">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4" />
                        {job.location}
                      </span>
                      <span>
                        Posted{' '}
                        {new Date(`${job.postedDate}T12:00:00`).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
          {!shown.length && (
            <EmptyState
              icon={<Search />}
              title="No roles match"
              description="Try broadening your search or clearing a filter."
            />
          )}
        </div>
      </section>
      <section className="rounded-2xl bg-primary px-7 py-10 text-primary-foreground sm:px-12">
        <Building2 className="mb-5 size-7" />
        <h2 className="text-2xl font-semibold">Not seeing your role yet?</h2>
        <p className="mt-2 max-w-xl opacity-80">
          Our team keeps growing. Check back soon for new opportunities across product, engineering, and
          operations.
        </p>
      </section>
    </div>
  )
}
