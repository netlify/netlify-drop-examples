import { useState } from 'react'
import { CalendarDays, Info } from 'lucide-react'
import { Badge, Button } from 'app-packs-ui'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { dashboardConfig } from '@/config/dashboard'
import type { DashboardMeta } from '@/server/dashboard'
import {
  endOfMonth,
  monthStart,
  presetLabels,
  presetRange,
  type DateRange,
  type RangePreset,
} from '@/lib/metrics'
import { todayIso } from '@/lib/range'

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fromIso = (iso: string) =>
  new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))

export function DateRangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>({})
  const apply = (r: DateRange) => {
    onChange(r)
    setOpen(false)
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="small">
          <CalendarDays className="size-4" />
          {dateLabel(range.from)} – {dateLabel(range.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-1 border-b p-2 sm:w-48 sm:border-r sm:border-b-0">
            {(Object.keys(presetLabels) as Array<RangePreset>).map((p) => (
              <Button
                key={p}
                variant="ghost"
                size="small"
                className="justify-start"
                onClick={() => apply(presetRange(p, todayIso()))}
              >
                {presetLabels[p]}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <p className="px-2 pt-1 text-xs text-muted-foreground">Custom month range</p>
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={fromIso(range.from)}
              selected={
                draft.from
                  ? { from: draft.from, to: draft.to }
                  : { from: fromIso(range.from), to: fromIso(range.to) }
              }
              onSelect={(r) => {
                setDraft({ from: r?.from, to: r?.to })
                if (r?.from && r?.to) {
                  apply({ from: monthStart(toIso(r.from)), to: endOfMonth(monthStart(toIso(r.to))) })
                  setDraft({})
                }
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const sourceLabel: Record<string, string> = {
  csv: 'CSV upload',
  snowflake: 'Snowflake',
  salesforce: 'Salesforce',
  seed: 'Sample data',
}

/** Per-dataset "Last updated" stamp with its source. */
export function LastUpdated({ meta }: { meta: DashboardMeta }) {
  const items: Array<[string, DashboardMeta['opportunities']]> = [
    ['Opportunities', meta.opportunities],
    ['ARR snapshots', meta.arr_snapshots],
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([label, m]) => (
        <span key={label} suppressHydrationWarning>
          {label}:{' '}
          {m ? (
            <>
              updated {new Date(m.updatedAt).toLocaleString()} · {sourceLabel[m.source] ?? m.source}
            </>
          ) : (
            'no data loaded'
          )}
        </span>
      ))}
    </div>
  )
}

/** "How these metrics are calculated" — rendered from config, with Inferred badges. */
export function MethodologySheet() {
  const c = dashboardConfig
  const policies = [
    {
      title: 'Pipeline stages & probabilities',
      p: c.stages,
      display: c.stages.value.map((s) => `${s.name} ${Math.round(s.probability * 100)}%`).join(' · '),
    },
    { title: 'Churn', p: c.churnDefinition, display: c.churnDefinition.description },
    { title: 'Fiscal year', p: c.fiscalYearStartMonth, display: c.fiscalYearStartMonth.description },
    { title: 'Closed-won ARR', p: c.closedWonAmountIsArr, display: c.closedWonAmountIsArr.description },
  ]
  const formulas: Array<[string, string]> = [
    ['Total pipeline', 'Sum of amount for open opportunities with a close date in range.'],
    ['Weighted pipeline', 'Sum of amount × stage probability for those open opportunities.'],
    ['Closed-won ARR', 'Sum of amount for won opportunities closed in range.'],
    ['Win rate', 'Won ÷ (won + lost), by count, for opportunities closed in range.'],
    ['Average sales cycle', 'Mean days from created to close for won opportunities closed in range.'],
    ['Net new ARR', 'New + expansion − contraction − churn, summed over months in range.'],
  ]
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="small">
          <Info className="size-4" />
          How these metrics are calculated
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>How these metrics are calculated</SheetTitle>
          <SheetDescription>
            {c.dataClassification.label} · Tier {c.dataClassification.tier}. Figures are aggregates of the
            loaded data; per-deal rows never leave the server.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6 text-sm">
          <section className="space-y-3">
            <h3 className="font-medium">Metrics</h3>
            {formulas.map(([name, text]) => (
              <div key={name}>
                <p className="font-medium">{name}</p>
                <p className="text-muted-foreground">{text}</p>
              </div>
            ))}
          </section>
          <section className="space-y-3">
            <h3 className="font-medium">Definitions</h3>
            {policies.map(({ title, p, display }) => (
              <div key={title}>
                <p className="flex items-center gap-2 font-medium">
                  {title}
                  {p.inferred ? <Badge variant="secondary">Inferred</Badge> : null}
                </p>
                <p className="text-muted-foreground">{display}</p>
              </div>
            ))}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
