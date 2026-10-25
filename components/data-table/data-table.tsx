"use client";

import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
  type ExpandedState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { DataTableProps } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Settings2,
  Search,
  X,
  Pencil,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function DataTable<TData>({
  columns,
  data,
  loading,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  facetedFilters,
  renderSubComponent,
  getRowCanExpand,
  enableRowSelection,
  onSelectedRowsChange,
  enableColumnVisibility,
  pageSize: defaultPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  toolbarActions,
  emptyMessage = "Aucun résultat",
  renderEmpty,
  enableMultiSort,
  onCellEdit,
  editableColumns,
  onRowClick,
  rowClassName,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [editingCell, setEditingCell] = useState<{ row: string; col: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const sortIndexMap = new Map(
    sorting.map((s, i) => [s.id, i + 1])
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      expanded,
      globalFilter: searchValue,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: onSearchChange,
    enableMultiSort: enableMultiSort ?? true,
    isMultiSortEvent: () => enableMultiSort ? true : false,
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      if (value == null) return false;
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    },
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      if (onSelectedRowsChange) {
        const newSelection = typeof updater === "function" ? updater(rowSelection) : updater;
        const selectedRows = Object.keys(newSelection).map((id) => data[Number(id)]);
        onSelectedRowsChange(selectedRows);
      }
    },
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: getRowCanExpand,
    enableRowSelection: enableRowSelection,
    enableExpanding: !!renderSubComponent,
    autoResetPageIndex: false,
  });

  const allColumns = table.getAllColumns().filter((c) => c.getCanHide());
  const hasPagination = table.getPageCount() > 1;
  const hasFilters = facetedFilters && facetedFilters.length > 0;
  const hasToolbar = searchValue !== undefined || hasFilters || enableColumnVisibility || toolbarActions;

  return (
    <div className="rounded-lg border border-border bg-card">
      {hasToolbar && (
        <div className="flex items-center gap-2 p-3 border-b border-border flex-wrap">
          {searchValue !== undefined && onSearchChange && (
            <div className="relative flex-1 min-w-[120px] w-full sm:w-auto sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-8 h-8 text-sm"
                autoComplete="off"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}

          {facetedFilters?.map((filter) => {
            const column = table.getColumn(filter.columnId);
            if (!column) return null;
            const filterValue = column.getFilterValue() as string | undefined;
            const selectedOption = filter.options.find((o) => o.value === filterValue);

            return (
              <Select
                key={filter.columnId}
                value={filterValue ?? "ALL"}
                onValueChange={(v) => column.setFilterValue(v === "ALL" ? undefined : v)}
              >
                <SelectTrigger className="h-8 w-auto gap-1 text-sm min-w-[120px]">
                  <span className="text-muted-foreground text-xs">{filter.title}:</span>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tous</SelectItem>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}

          {toolbarActions}

          <div className="flex-1" />

          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                  Colonnes
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {allColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  >
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="relative">
        {loading && (
          <div className="absolute top-0 left-0 right-0 z-10">
            <div className="h-0.5 bg-muted overflow-hidden">
              <div className="h-full w-1/3 bg-primary rounded-full animate-loading-bar" />
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-transparent">
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-xs font-medium text-muted-foreground py-2 select-none"
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                        cursor: header.column.getCanSort() ? "pointer" : "default",
                      }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="inline-flex items-center gap-0.5">
                            {{
                              asc: <ChevronUp className="h-3 w-3" />,
                              desc: <ChevronDown className="h-3 w-3" />,
                            }[header.column.getIsSorted() as string] ?? (
                                <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                              )}
                            {header.column.getIsSorted() && enableMultiSort && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {sortIndexMap.get(header.id)}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 text-muted-foreground text-sm"
                  >
                    {renderEmpty ? renderEmpty() : emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        "hover:bg-muted/40",
                        row.getIsSelected() && "bg-muted/50",
                        onRowClick && "cursor-pointer",
                        rowClassName?.(row.original),
                      )}

                      onClick={() => onRowClick?.(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isEditing =
                          editingCell?.row === row.id &&
                          editingCell?.col === cell.column.id;
                        const isEditable = editableColumns?.includes(cell.column.id);

                        return (
                          <TableCell key={cell.id} className="py-2.5">
                            {isEditing ? (
                              <Input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => {
                                  onCellEdit?.(row.id, cell.column.id, editValue);
                                  setEditingCell(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    onCellEdit?.(row.id, cell.column.id, editValue);
                                    setEditingCell(null);
                                  }
                                  if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                className="h-7 text-sm"
                              />
                            ) : (
                              <div
                                className={cn(
                                  "flex items-center gap-1.5",
                                  isEditable && "cursor-pointer group"
                                )}
                                onDoubleClick={() => {
                                  if (!isEditable) return;
                                  const el = cell.getContext().getValue();
                                  setEditValue(String(el ?? ""));
                                  setEditingCell({ row: row.id, col: cell.column.id });
                                }}
                              >
                                <span className="flex-1">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </span>
                                {isEditable && (
                                  <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-colors" />
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {row.getIsExpanded() && renderSubComponent && (
                      <TableRow key={`${row.id}-expanded`}>
                        <TableCell colSpan={columns.length} className="p-0 border-t-0">
                          {renderSubComponent({ row })}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {hasPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length,
              )}{" "}
              sur {data.length}
            </span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => {
                table.setPageSize(Number(v));
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs gap-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground min-w-[60px] text-center">
              Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
