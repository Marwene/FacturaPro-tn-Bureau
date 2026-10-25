"use client"

import { useExportDetail, useExportMutations, useNgpCodesForExport } from "@/hooks/use-exports"
import { useExportDetailEditStore } from "@/lib/stores/export-store"
import { StatCard } from "@/components/stat-card"
import { Separator } from "@/components/ui/separator"
import { notify } from "@/lib/notify"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FileText } from "lucide-react"
import type { ExportStatus } from "@/lib/types"
import type { ExportLineForm } from "@/lib/stores/export-store"
import { ConfirmDialog } from "@/components/confirm-delete-dialog"
import { ExportDetailSkeleton } from "./export-detail-skeleton"
import { ExportDetailHeader } from "./export-detail-header"
import { ExportDetailInfoCards } from "./export-detail-info-cards"
import { ExportDetailLinesTable } from "./export-detail-lines-table"

export function ExportDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { data, isLoading, isFetching } = useExportDetail(id)
  const { data: ngpData } = useNgpCodesForExport()
  const { updateExport, deleteExport } = useExportMutations()

  const isEditing = useExportDetailEditStore((s) => s.isEditing)
  const editDecVente = useExportDetailEditStore((s) => s.decVente)
  const editDateDecVente = useExportDetailEditStore((s) => s.dateDecVente)
  const editSimultanee = useExportDetailEditStore((s) => s.simultanee)
  const editDateSimultanee = useExportDetailEditStore((s) => s.dateSimultanee)
  const editNotes = useExportDetailEditStore((s) => s.notes)
  const editLines = useExportDetailEditStore((s) => s.lines)
  const startEditing = useExportDetailEditStore((s) => s.startEditing)
  const cancelEditing = useExportDetailEditStore((s) => s.cancelEditing)
  const setDecVente = useExportDetailEditStore((s) => s.setDecVente)
  const setDateDecVente = useExportDetailEditStore((s) => s.setDateDecVente)
  const setSimultanee = useExportDetailEditStore((s) => s.setSimultanee)
  const setDateSimultanee = useExportDetailEditStore((s) => s.setDateSimultanee)
  const setNotes = useExportDetailEditStore((s) => s.setNotes)
  const addLine = useExportDetailEditStore((s) => s.addLine)
  const removeLine = useExportDetailEditStore((s) => s.removeLine)
  const updateLine = useExportDetailEditStore((s) => s.updateLine)

  if (isLoading) return <ExportDetailSkeleton />

  const exp = data?.export
  if (!exp) {
    return (
      <div className="flex-1 p-4">
        <p className="text-sm text-muted-foreground">Export introuvable</p>
      </div>
    )
  }

  const lines = exp.lines ?? []
  const totalQte = lines.reduce((s, l) => s + parseFloat(l.quantite || "0"), 0)
  const totalQteBL = lines.reduce((s, l) => s + parseFloat(l.quantiteBL || "0"), 0)
  const totalReste = lines.reduce((s, l) => s + parseFloat(l.resteQuantite || "0"), 0)

  const saveEditing = () => {
    const payload: Record<string, unknown> = {
      decVente: editDecVente || null,
      dateDecVente: editDateDecVente || null,
      simultanee: editSimultanee || null,
      dateSimultanee: editDateSimultanee || null,
      notes: editNotes || null,
      lines: editLines.filter((l) => l.ngpCodeId && l.quantite && parseFloat(l.quantite) > 0).map((l) => ({
        ngpCodeId: l.ngpCodeId,
        ngpCode: l.ngpCode,
        barcode: l.barcode,
        quantite: parseFloat(l.quantite) || 0,
        bonLivraisonId: l.bonLivraisonId || null,
        bonLivraisonNumero: l.bonLivraisonNumero || null,
        invoiceId: l.invoiceId || null,
        invoiceNumero: l.invoiceNumero || null,
      })),
    }
    updateExport.mutate(
      { id: exp.id, ...payload },
      {
        onSuccess: () => { notify.success({ title: `Export ${exp.numero} mis à jour` }); cancelEditing() },
        onError: (err) => notify.error({ title: "Export non modifié", error: err, context: "mise à jour de l'export" }),
      }
    )
  }

  const handleStatus = (status: ExportStatus) => {
    updateExport.mutate(
      { id: exp.id, status },
      {
        onSuccess: () => {
          const libelle =
            status === "EN_COURS" ? `Export ${exp.numero} marqué en cours`
            : status === "VALIDE" ? `Export ${exp.numero} validé`
            : status === "ANNULE" ? `Export ${exp.numero} annulé`
            : `Export ${exp.numero} : statut mis à jour`;
          notify.success({ title: libelle });
        },
        onError: (err) => notify.error({ title: "Changement de statut impossible", error: err, context: "mise à jour du statut de l'export" }),
      }
    )
  }

  const handleUpdateLine = (id: string, field: string, value: string) => {
    if (field === "ngpCodeId" && ngpData?.codes) {
      const code = ngpData.codes.find((c) => c.id === value)
      if (code) { updateLine(id, "ngpCodeId", value); updateLine(id, "ngpCode", code.code); updateLine(id, "barcode", code.barcode ?? ""); return }
    }
    updateLine(id, field as keyof ExportLineForm, value)
  }

  const editStore = { decVente: editDecVente, dateDecVente: editDateDecVente, simultanee: editSimultanee, dateSimultanee: editDateSimultanee, notes: editNotes, setDecVente, setDateDecVente, setSimultanee, setDateSimultanee, setNotes }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <ExportDetailHeader
        exp={exp}
        isEditing={isEditing}
        isPending={updateExport.isPending}
        onBack={() => router.push("/exports")}
        onEdit={() => startEditing(exp)}
        onCancelEdit={cancelEditing}
        onSave={saveEditing}
        onStatusChange={handleStatus}
        onDelete={() => setDeleteOpen(true)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() =>
          deleteExport.mutate(exp.id, {
            onSuccess: () => { notify.success({ title: `Export ${exp.numero} supprimé` }); router.push("/exports") },
            onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression de l'export" }),
          })
        }
        title="Supprimer cet export ?"
        description={`L'export ${exp.numero} et ses lignes seront définitivement supprimés.`}
        isLoading={deleteExport.isPending}
      />

      <Separator />

      <div className="grid grid-cols-4 gap-3">
        <StatCard title="Lignes" value={String(lines.length)} subtitle={`${lines.length} produits`} icon={FileText} />
        <StatCard title="Quantité totale" value={totalQte.toFixed(3)} subtitle="Qté export déclarée" />
        <StatCard title="Qté BL" value={totalQteBL > 0 ? totalQteBL.toFixed(3) : "—"} subtitle="Quantité sur BL" />
        <StatCard title="Reste" value={totalReste.toFixed(3)} subtitle="Reste à exporter" subtitleVariant={totalReste > 0 ? "warning" : "default"} valueClassName={totalReste === 0 ? "text-emerald-600" : totalReste < 0 ? "text-red-600" : "text-amber-600"} />
      </div>

      <ExportDetailInfoCards exp={exp} isEditing={isEditing} edit={editStore} />

      <ExportDetailLinesTable
        lines={lines}
        isEditing={isEditing}
        editLines={editLines}
        ngpCodes={ngpData?.codes}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        onUpdateLine={handleUpdateLine}
      />

      {isFetching && !isLoading && <p className="text-xs text-muted-foreground text-center">Mise à jour...</p>}
    </div>
  )
}
