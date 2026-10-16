import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Search, SearchX } from 'lucide-react'
import { EmptyState, Input } from 'app-packs-ui'
import { getLearnerOverviewServer } from '@/server/learning'
import { appConfig } from '@/config/app'
import { CourseCard } from '@/components/learning/course-card'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/courses/')({
  loader: () => getLearnerOverviewServer(),
  head: () => ({ meta: [{ title: `Course catalog · ${appConfig.productName}` }] }),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'courses')} />,
  component: CatalogPage,
})

const ALL = 'All topics'

function CatalogPage() {
  const { courses } = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)

  const categories = useMemo(() => [ALL, ...new Set(courses.map((c) => c.category))], [courses])
  const visible = courses.filter((c) => {
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q || [c.title, c.summary, c.category].some((field) => field.toLowerCase().includes(q))
    return matchesQuery && (category === ALL || c.category === category)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Course catalog</h1>
        <p className="text-muted-foreground">Every course available to Acme employees, grouped by topic.</p>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-md">
          <label htmlFor="course-search" className="sr-only">
            Search courses
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="course-search"
            type="search"
            placeholder="Search courses…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div
          role="group"
          aria-label="Filter by topic"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                category === cat
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground" role="status">
        Showing {visible.length} of {courses.length} courses
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="No matching courses"
          description="Try a different search term or topic."
          icon={<SearchX className="size-6" aria-hidden="true" />}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <li key={course.id} className="flex">
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
