import { createFileRoute, Link } from '@tanstack/react-router'
import { FileText, Clock, DollarSign } from 'lucide-react'
import { listRecordsServer } from '@/server/records'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from 'app-packs-ui'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState } from '@/components/states/error-state'

// NOTE: this loader calls the createServerFn-wrapped `listRecordsServer`
// (src/server/records.ts), not `data/records.ts` directly. Route loaders
// are bundled for client-side navigations too, and `data/records.ts`
// imports the Node-only Postgres driver — importing it here would break
// the client build. Same reasoning applies to `demoMode`, which comes from
// the root route's context (resolved server-side) rather than calling
// `isDemoMode()` (a server-only helper) from route code.
export const Route = createFileRoute('/')({
  loader: () => listRecordsServer(),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) => (
    <ErrorState message={error instanceof Error ? error.message : 'Failed to load dashboard'} />
  ),
  component: Dashboard,
})

const statusVariant: Record<string, 'primary' | 'secondary' | 'outline'> = {
  active: 'primary',
  draft: 'secondary',
  done: 'outline',
  archived: 'outline',
}

function Dashboard() {
  const records = Route.useLoaderData()

  const activeCount = records.filter((r) => r.status === 'active').length
  const totalAmount = records.reduce((sum, r) => sum + Number(r.amount), 0)
  const recent = records.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">An overview of all records.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total records</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{records.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total amount</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent records</CardTitle>
            <CardDescription>The 5 most recently created records.</CardDescription>
          </div>
          <Button asChild size="small" variant="outline">
            <Link to="/records">View all</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records yet.</p>
          ) : (
            recent.map((record) => (
              <Link
                key={record.id}
                to="/records/$id"
                params={{ id: record.id }}
                className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{record.title}</p>
                  <p className="text-muted-foreground">{record.owner}</p>
                </div>
                <Badge variant={statusVariant[record.status] ?? 'secondary'}>{record.status}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
