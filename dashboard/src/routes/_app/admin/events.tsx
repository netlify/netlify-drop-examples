import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { requireRole } from '@/auth/server'
import { listEvents } from '@/data/events'
import { appConfig } from '@/config/app'
import { Card, CardContent, CardHeader, CardTitle, EmptyState } from 'app-packs-ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'

const listEventsServer = createServerFn({ method: 'GET' }).handler(async () => {
  await requireRole([appConfig.adminRole])
  return listEvents()
})

export const Route = createFileRoute('/_app/admin/events')({
  loader: () => listEventsServer(),
  pendingComponent: () => <LoadingState variant="table" />,
  errorComponent: ({ error }) => <ErrorState {...friendlyError(error, 'usage events')} />,
  component: EventsPage,
})

function EventsPage() {
  const events = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usage events</h1>
        <p className="text-muted-foreground">Page views and record mutations tracked via `trackEvent()`.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <EmptyState title="No events yet" description="Navigate around the app to generate some." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{new Date(event.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{event.name}</TableCell>
                    <TableCell>{event.path ?? '—'}</TableCell>
                    <TableCell>{event.actorEmail ?? 'anonymous'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
