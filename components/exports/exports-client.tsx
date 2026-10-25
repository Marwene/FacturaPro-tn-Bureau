"use client"

import { useExportList, useExportMutations } from "@/hooks/use-exports"
import { useExportListStore } from "@/lib/stores/export-store"
import { StatCard } from "@/components/stat-card"
import { DataTable } from "@/components/data-table"
import { ModifierExportDialog } from "@/components/exports/modifier-export-dialog"
import { ExportListSkeleton } from "./export-list-skeleton"
import { useExportColumns } from "./export-list-columns"

export function ExportsClient() {
  const searchInput = useExportListStore((s) => s.searchInput)
  const setSearchInput = useExportListStore((s) => s.setSearchInput)
  const editDialogOpen = useExportListStore((s) => s.editDialogOpen)
  const closeEditDialog = useExportListStore((s) => s.closeEditDialog)
  const editExportData = useExportListStore((s) => s.editExportData)
  const openEditDialog = useExportListStore((s) => s.openEditDialog)

  const { data, isFetching, isLoading } = useExportList()
  const { updateExport, deleteExport } = useExportMutations()

  const stats = data?.stats
  const columns = useExportColumns(updateExport, deleteExport, openEditDialog)

  if (isLoading) return <ExportListSkeleton />

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard title="Total Exports" value={String(stats?.total ?? 0)} subtitle={`${stats?.total ?? 0} exports`} />
        <StatCard title="En cours" value={String(stats?.enCours ?? 0)} subtitle={`${stats?.enCours ?? 0} exports`} subtitleVariant={Number(stats?.enCours) > 0 ? "warning" : "default"} />
        <StatCard title="Validés" value={String(stats?.valide ?? 0)} subtitle={`${stats?.valide ?? 0} exports`} subtitleVariant="success" />
        <StatCard title="Brouillons" value={String(stats?.brouillon ?? 0)} subtitle={`${stats?.brouillon ?? 0} exports`} />
      </div>

      <DataTable
        columns={columns}
        data={data?.exports ?? []}
        loading={isFetching}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Rechercher (N°, client...)"
        facetedFilters={[{
          columnId: "status", title: "Statut",
          options: [
            { label: "Brouillon", value: "BROUILLON" },
            { label: "En cours", value: "EN_COURS" },
            { label: "Validé", value: "VALIDE" },
            { label: "Annulé", value: "ANNULE" },
          ],
        }]}
        enableColumnVisibility
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
      />

      {editExportData && (
        <ModifierExportDialog open={editDialogOpen} onOpenChange={closeEditDialog} exportData={editExportData} />
      )}
    </div>
  )
}
