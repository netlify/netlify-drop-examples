import { useRef, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Download, Loader2, RefreshCw, Upload } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  toast,
} from 'app-packs-ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState } from '@/components/states/loading-state'
import { ErrorState, friendlyError } from '@/components/states/error-state'
import { dashboardConfig } from '@/config/dashboard'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import {
  getDataPageServer,
  uploadDatasetServer,
  type BatchSummary,
  type UploadResult,
} from '@/server/datasets'
import { datasetColumns, type DatasetId } from '@/datasets/contract'

export const Route = createFileRoute('/_app/data')({
  // `getDataPageServer` enforces the editor/admin roles; viewers get the 403 state below.
  loader: () => getDataPageServer(),
  pendingComponent: () => <LoadingState variant="card" />,
  errorComponent: ({ error }) =>
    error instanceof Error && error.message.startsWith('403') ? (
      <ErrorState
        title="Not allowed"
        message={`Loading data is limited to ${appConfig.dataEditorRoles.join(' and ')} roles.`}
      />
    ) : (
      <ErrorState {...friendlyError(error, 'the data page')} />
    ),
  component: DataPage,
})

const datasets: Array<{ id: DatasetId; title: string; description: string; example: string }> = [
  {
    id: 'opportunities',
    title: 'Opportunities',
    description: 'One row per deal. Replaces the current opportunities dataset.',
    example: `o_1001,Avery Lindqvist,Proposal,24000,2026-07-14,2026-10-30,Mid-Market,Inbound,open`,
  },
  {
    id: 'arr_snapshots',
    title: 'ARR snapshots',
    description: 'One row per account per month. Replaces the current ARR dataset.',
    example: `acct_7f3k2m,2026-09-01,48000`,
  },
]

function templateHref(id: DatasetId, example: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(`${datasetColumns[id].join(',')}\n${example}\n`)}`
}

function DataPage() {
  const { history, snowflakeEnabled, salesforceEnabled } = Route.useLoaderData()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Data</h1>
        <p className="text-muted-foreground">
          Load the datasets behind the dashboard. Every load fully replaces the previous one, and files are
          validated before anything is stored.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {datasets.map((d) => (
          <DatasetCard
            key={d.id}
            {...d}
            history={history[d.id]}
            snowflakeEnabled={snowflakeEnabled}
            salesforceEnabled={salesforceEnabled && d.id === 'opportunities'}
          />
        ))}
      </div>
    </div>
  )
}

function DatasetCard({
  id,
  title,
  description,
  example,
  history,
  snowflakeEnabled,
  salesforceEnabled,
}: (typeof datasets)[number] & {
  history: Array<BatchSummary>
  snowflakeEnabled: boolean
  salesforceEnabled: boolean
}) {
  const router = useRouter()
  const { demoMode } = useAppContext()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<(UploadResult & { ok: false }) | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.set('dataset', id)
      body.set('file', file)
      const result = await uploadDatasetServer({ data: body })
      if (result.ok) {
        toast({ title: `${title} updated`, description: `${result.rowCount.toLocaleString()} rows loaded.` })
        await router.invalidate()
      } else setError(result)
    } catch (err) {
      setError({
        ok: false,
        row: null,
        column: null,
        message: err instanceof Error ? err.message : 'Upload failed',
      })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function refreshFromSnowflake() {
    const sinceKey = id === 'opportunities' ? 'since' : 'since_month'
    return refresh('Snowflake', '/api/datasets/refresh', {
      queryId: dashboardConfig.datasetQueries[id],
      params: { [sinceKey]: `${new Date().getFullYear() - 3}-01-01` },
    })
  }

  async function refresh(label: string, url: string, body?: unknown) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const payload = await res.json().catch(() => ({}))
      if (res.ok) {
        toast({
          title: `${title} refreshed`,
          description: `${payload.rowCount.toLocaleString()} rows loaded from ${label}.`,
        })
        await router.invalidate()
      } else
        setError({
          ok: false,
          row: payload.row ?? null,
          column: payload.column ?? null,
          message: payload.message ?? payload.error ?? `Refresh failed (${res.status})`,
        })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <p className="font-medium">Required columns</p>
          <code className="block rounded-md bg-muted p-2 text-xs break-words">
            {datasetColumns[id].join(', ')}
          </code>
          <p className="text-xs text-muted-foreground">
            Exactly these columns, nothing else. Dates are YYYY-MM-DD; amounts are non-negative numbers.
            {id === 'arr_snapshots'
              ? ' account_id must be an opaque ID — no account names.'
              : ' Stage must be one of: '}
            {id === 'opportunities' ? dashboardConfig.stages.value.map((s) => s.name).join(', ') + '.' : null}
          </p>
          <a
            className="inline-flex items-center gap-1 text-xs underline"
            download={`${id}-template.csv`}
            href={templateHref(id, example)}
          >
            <Download className="size-3" /> Download template CSV
          </a>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label={`${title} CSV file`}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Upload CSV
          </Button>
          {snowflakeEnabled ? (
            <Button variant="outline" onClick={refreshFromSnowflake} disabled={busy}>
              <RefreshCw className="size-4" /> Refresh from Snowflake
            </Button>
          ) : null}
          {salesforceEnabled ? (
            <Button
              variant="outline"
              onClick={() => refresh('Salesforce', '/api/datasets/refresh/salesforce')}
              disabled={busy}
            >
              <RefreshCw className="size-4" /> Refresh from Salesforce
            </Button>
          ) : null}
        </div>
        {salesforceEnabled ? (
          <p className="text-xs text-muted-foreground">
            Salesforce also refreshes this dataset nightly at 04:00 UTC, replacing any CSV upload.
          </p>
        ) : null}
        {demoMode ? (
          <p className="text-xs text-muted-foreground">
            Demo mode: uploads replace the in-memory data until the server restarts.
          </p>
        ) : null}

        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Nothing was stored</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium">Batch history</p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No loads yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell suppressHydrationWarning>{new Date(b.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{b.createdByEmail ?? 'system'}</TableCell>
                    <TableCell>
                      {b.source} {b.active ? <Badge variant="primary">Active</Badge> : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{b.rowCount.toLocaleString()}</TableCell>
                    <TableCell>
                      {b.hasRaw ? (
                        <a className="text-xs underline" href={`/api/datasets/${b.id}/raw`}>
                          Raw file
                        </a>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
