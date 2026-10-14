import { useState, type ReactNode } from 'react'
import { Table2, BarChart3 } from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from 'app-packs-ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export type TableView = { columns: Array<string>; rows: Array<Array<string>> }

/** A chart with a table-view toggle, so identity and values never rely on color or hover alone. */
export function ChartCard({
  title,
  description,
  table,
  children,
}: {
  title: string
  description?: string
  table: TableView
  children: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <Button size="small" variant="outline" onClick={() => setShowTable((v) => !v)}>
          {showTable ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
          {showTable ? 'Chart' : 'Table'}
        </Button>
      </CardHeader>
      <CardContent>
        {showTable ? (
          <Table>
            <TableHeader>
              <TableRow>
                {table.columns.map((c, i) => (
                  <TableHead key={c} className={i > 0 ? 'text-right' : undefined}>
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((r) => (
                <TableRow key={r[0]}>
                  {r.map((cell, i) => (
                    <TableCell key={i} className={i > 0 ? 'text-right tabular-nums' : undefined}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
