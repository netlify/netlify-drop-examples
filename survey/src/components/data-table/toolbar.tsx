import { X } from 'lucide-react'
import type { ReactTable, RowData } from '@tanstack/react-table'
import { dataTableFeatures } from '@/components/data-table/features'
import { Input, Button } from 'app-packs-ui'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type FilterableColumn = {
  id: string
  title: string
  options: Array<{ label: string; value: string }>
}

export function DataTableToolbar<TData extends RowData>({
  table,
  searchPlaceholder = 'Search...',
  filterableColumns = [],
}: {
  table: ReactTable<typeof dataTableFeatures, TData>
  searchPlaceholder?: string
  filterableColumns?: Array<FilterableColumn>
}) {
  const globalFilter = table.state.globalFilter as string | undefined
  const isFiltered = !!globalFilter || table.state.columnFilters.length > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder={searchPlaceholder}
        value={globalFilter ?? ''}
        onChange={(e) => table.setGlobalFilter(e.target.value)}
        className="h-8 w-full max-w-sm"
      />

      {filterableColumns.map((filter) => {
        const column = table.getColumn(filter.id)
        if (!column) return null
        const value = (column.getFilterValue() as string) ?? 'all'
        return (
          <Select
            key={filter.id}
            value={value}
            onValueChange={(v) => column.setFilterValue(v === 'all' ? undefined : v)}
          >
            <SelectTrigger size="sm" className="h-8 w-[150px]">
              <SelectValue placeholder={filter.title} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filter.title.toLowerCase()}</SelectItem>
              {filter.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      })}

      {isFiltered ? (
        <Button
          variant="ghost"
          size="small"
          className="h-8"
          onClick={() => {
            table.setGlobalFilter('')
            table.resetColumnFilters()
          }}
        >
          Reset
          <X className="ml-1 size-3.5" />
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="small" className="ml-auto h-8">
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {table
            .getAllLeafColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
                onSelect={(e) => e.preventDefault()}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
