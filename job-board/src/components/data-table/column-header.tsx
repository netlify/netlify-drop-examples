import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { Column, RowData } from '@tanstack/react-table'
import { Button } from 'app-packs-ui'
import { cn } from '@/lib/utils'
import { dataTableFeatures } from '@/components/data-table/features'

export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<typeof dataTableFeatures, TData, TValue>
  title: string
  className?: string
}) {
  if (!column.getCanSort()) {
    return <div className={cn('text-sm font-medium', className)}>{title}</div>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="small"
      className={cn('-ml-3 h-8 gap-1.5', className)}
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUp className="size-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ChevronsUpDown className="size-3.5 text-muted-foreground" />
      )}
    </Button>
  )
}
