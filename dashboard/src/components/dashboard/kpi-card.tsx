import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from 'app-packs-ui'

export function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: string
  hint?: string
  icon: LucideIcon
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
