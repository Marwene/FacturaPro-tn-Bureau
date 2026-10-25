import type { ColumnDef, Row } from "@tanstack/react-table";

export interface FacetedFilterDef {
  columnId: string;
  title: string;
  options: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }[];
}

export interface DateRangeFilterDef {
  columnId: string;
  from?: Date;
  to?: Date;
  onChange?: (range: { from?: Date; to?: Date }) => void;
}

export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;

  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  facetedFilters?: FacetedFilterDef[];

  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;
  getRowCanExpand?: (row: Row<TData>) => boolean;

  enableRowSelection?: boolean;
  onSelectedRowsChange?: (rows: TData[]) => void;
  getRowId?: (row: TData) => string;

  enableColumnVisibility?: boolean;

  pageSize?: number;
  pageSizeOptions?: number[];

  toolbarActions?: React.ReactNode;

  emptyMessage?: string;
  renderEmpty?: () => React.ReactNode;

  enableMultiSort?: boolean;
  onCellEdit?: (rowId: string, columnId: string, value: string) => void;
  editableColumns?: string[];

  // NOUVEAU : click sur la ligne
  onRowClick?: (row: TData) => void;
  // Optionnel : style de curseur quand cliquable
  rowClassName?: (row: TData) => string;
}
