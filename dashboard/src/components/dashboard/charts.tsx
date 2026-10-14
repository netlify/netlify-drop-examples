import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { money, monthLabel, vizColor } from '@/lib/format'
import type { ArrMovement } from '@/lib/metrics'

type PipelineRows = Array<{ stage: string; total: number } & Record<string, number | string>>

const GAP = { stroke: 'var(--card)', strokeWidth: 2 } as const

/** Open pipeline by stage, stacked by a breakdown dimension. */
export function PipelineChart({
  series,
  rows,
  height = 300,
}: {
  series: Array<string>
  rows: PipelineRows
  height?: number
}) {
  const config: ChartConfig = Object.fromEntries(series.map((s, i) => [s, { label: s, color: vizColor(i) }]))
  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <BarChart data={rows} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis dataKey="stage" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => money(v)} />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v), false)} />} />
        {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
        {series.map((s, i) => (
          <Bar
            key={s}
            dataKey={s}
            stackId="stage"
            fill={vizColor(i)}
            maxBarSize={56}
            radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
            {...GAP}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

const arrConfig = {
  newArr: { label: 'New', color: 'var(--viz-1)' },
  expansion: { label: 'Expansion', color: 'var(--viz-3)' },
  contraction: { label: 'Contraction', color: 'var(--viz-2)' },
  churn: { label: 'Churn', color: 'var(--viz-8)' },
  net: { label: 'Net new ARR', color: 'var(--foreground)' },
} satisfies ChartConfig

/** Monthly ARR movements: gains up, losses down, net as a line. */
export function ArrChart({ movements, height = 340 }: { movements: Array<ArrMovement>; height?: number }) {
  const data = movements.map((m) => ({ ...m, label: monthLabel(m.month) }))
  return (
    <ChartContainer config={arrConfig} className="w-full" style={{ height }}>
      <ComposedChart data={data} margin={{ left: 4, right: 4 }} stackOffset="sign">
        <CartesianGrid vertical={false} strokeOpacity={0.4} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => money(v)} />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v), false)} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="newArr" stackId="arr" fill="var(--viz-1)" maxBarSize={28} {...GAP} />
        <Bar
          dataKey="expansion"
          stackId="arr"
          fill="var(--viz-3)"
          maxBarSize={28}
          radius={[4, 4, 0, 0]}
          {...GAP}
        />
        <Bar dataKey="contraction" stackId="arr" fill="var(--viz-2)" maxBarSize={28} {...GAP} />
        <Bar
          dataKey="churn"
          stackId="arr"
          fill="var(--viz-8)"
          maxBarSize={28}
          radius={[0, 0, 4, 4]}
          {...GAP}
        />
        <Line
          dataKey="net"
          type="monotone"
          stroke="var(--foreground)"
          strokeWidth={2}
          dot={{ r: 4, ...GAP }}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

export function arrTable(movements: Array<ArrMovement>) {
  return {
    columns: ['Month', 'New', 'Expansion', 'Contraction', 'Churn', 'Net'],
    rows: movements.map((m) => [
      monthLabel(m.month),
      ...[m.newArr, m.expansion, m.contraction, m.churn, m.net].map((v) => money(v, false)),
    ]),
  }
}

export function pipelineTable(series: Array<string>, rows: PipelineRows) {
  return {
    columns: ['Stage', ...series, 'Total'],
    rows: rows.map((r) => [r.stage, ...series.map((s) => money(Number(r[s]), false)), money(r.total, false)]),
  }
}
