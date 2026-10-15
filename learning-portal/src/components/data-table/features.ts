import {
  tableFeatures,
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  createSortedRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
} from '@tanstack/react-table'

/**
 * Single registration point for the @tanstack/react-table v9 features this
 * app's DataTable uses: sorting, column + global filtering, column
 * visibility, pagination, and row selection (wired up but unused by default
 * — flip `enableRowSelection` on a table to use it).
 *
 * `useTable` in data-table.tsx is generic over this object, so every table
 * in the app shares the same feature set and row-model behavior.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
})

export type DataTableFeatures = typeof dataTableFeatures
