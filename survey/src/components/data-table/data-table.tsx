import { useState, type ReactNode } from 'react'
import { useTable, type ColumnDef, type RowData } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { dataTableFeatures } from '@/components/data-table/features'
import { DataTableToolbar, type FilterableColumn } from '@/components/data-table/toolbar'
import { DataTablePagination } from '@/components/data-table/pagination'
import { LoadingState } from '@/components/states/loading-state'
import { EmptyState } from 'app-packs-ui'

export type DataTableColumn<TData extends RowData> = ColumnDef<typeof dataTableFeatures, TData, any>

/**
 * Generic table used across the app. Wraps @tanstack/react-table v9
 * (`useTable` + the shared `dataTableFeatures` registration) with sorting,
 * global search, column filters, column visibility, and pagination baked in.
 *
 * Usage: `<DataTable columns={surveyColumns} data={surveys} searchPlaceholder="Search surveys..." />`
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  searchPlaceholder,
  filterableColumns,
  isLoading,
  emptyState,
}: {
  columns: Array<DataTableColumn<TData>>
  data: Array<TData>
  searchPlaceholder?: string
  filterableColumns?: Array<FilterableColumn>
  isLoading?: boolean
  emptyState?: ReactNode
}) {
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])
  const [columnFilters, setColumnFilters] = useState<Array<{ id: string; value: unknown }>>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    state: { sorting, columnFilters, globalFilter, columnVisibility, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  })

  if (isLoading) {
    return <LoadingState variant="table" />
  }

  const rows = table.getPaginatedRowModel().rows

  return (
    <div className="space-y-3">
      <DataTableToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        filterableColumns={filterableColumns}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  {emptyState ?? (
                    <EmptyState title="No results" description="Nothing matches your filters yet." />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}
