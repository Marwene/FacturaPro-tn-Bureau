"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { BarcodeDisplay } from "@/components/barcode-display"
import { formatDate } from "@/lib/utils"
import { notify } from "@/lib/notify"
import type { SerializedExport, ExportStatus } from "@/lib/types"
import { MoreHorizontal, FileText, Trash2, CheckCircle, XCircle, Pencil } from "lucide-react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { useExportMutations } from "@/hooks/use-exports"

export type ExportRow = SerializedExport

type ExportMutations = ReturnType<typeof useExportMutations>

function statusBadge(status: ExportStatus) {
  const variants: Record<string, string> = {
    BROUILLON: "bg-gray-100 text-gray-700 border-gray-200",
    EN_COURS: "bg-gray-100 text-gray-700 border-gray-200",
    VALIDE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ANNULE: "bg-red-50 text-red-700 border-red-200",
  }
  const labels: Record<string, string> = {
    BROUILLON: "Brouillon", EN_COURS: "En cours", VALIDE: "Validé", ANNULE: "Annulé",
  }
  return <Badge variant="outline" className={`text-xs ${variants[status] ?? ""}`}>{labels[status] ?? status}</Badge>
}

export function useExportColumns(
  updateExport: ExportMutations["updateExport"],
  deleteExport: ExportMutations["deleteExport"],
  openEditDialog: (exp: ExportRow) => void,
): ColumnDef<ExportRow>[] {
  const columns: ColumnDef<ExportRow>[] = [
    { accessorKey: "numero", header: "N° Export", cell: (info) => <span className="font-medium text-sm">{info.renderValue() as string}</span> },
    {
      accessorFn: (row) => row.tiers?.raisonSociale ?? "—",
      id: "client", header: "Client",
      cell: (info) => {
        const client = info.row.original.tiers
        return <div><p className="text-sm font-medium">{client?.raisonSociale ?? "—"}</p><p className="text-xs text-muted-foreground">{client?.ville ?? ""}</p></div>
      },
    },
    { accessorKey: "dateCreation", header: "Date", cell: (info) => <span className="text-sm">{formatDate(info.renderValue() as Date)}</span> },
    {
      id: "snCount", header: "N° SN",
      cell: (info) => {
        const lines = info.row.original.lines ?? []
        return <span className="text-xs">{lines.map((l) => l.snNumero).filter(Boolean).join(", ") || "—"}</span>
      },
    },
    {
      id: "ngpCodes", header: "NGP",
      cell: (info) => {
        const codes = (info.row.original.lines ?? []).map((l) => l.ngpCode).filter(Boolean)
        return <div className="flex flex-col gap-0.5">{codes.length > 0 ? codes.map((c, i) => <span key={i} className="text-xs font-mono">{c}</span>) : "—"}</div>
      },
    },
    {
      id: "barcodes", header: "Code Barre",
      cell: (info) => {
        const barcodes = (info.row.original.lines ?? []).map((l) => l.barcode).filter((b): b is string => b !== null && b !== undefined)
        return <div className="flex flex-col gap-1">{barcodes.length > 0 ? barcodes.map((b, i) => <BarcodeDisplay key={i} value={b} compact />) : <span className="text-xs text-muted-foreground">—</span>}</div>
      },
    },
    {
      id: "qte", header: "Qté",
      cell: (info) => {
        const total = (info.row.original.lines ?? []).reduce((s, l) => s + parseFloat(l.quantite || "0"), 0)
        return <span className="text-sm">{total.toFixed(3)}</span>
      },
    },
    {
      id: "bl", header: "BL",
      cell: (info) => {
        const nums = (info.row.original.lines ?? []).map((l) => l.bonLivraisonNumero).filter(Boolean)
        return <div className="flex flex-col gap-0.5">{nums.length > 0 ? nums.map((n, i) => <span key={i} className="text-xs">{n}</span>) : "—"}</div>
      },
    },
    {
      header: "Date BL", id: "dateBL",
      cell: (info) => {
        const dates = (info.row.original.lines ?? []).map((l) => l.dateBL).filter(Boolean) as string[]
        return <div className="flex flex-col gap-0.5">{dates.length > 0 ? dates.map((d, i) => <span key={i} className="text-xs">{d ? formatDate(d) : ""}</span>) : "—"}</div>
      },
    },
    {
      id: "qteBL", header: "Qté BL",
      cell: (info) => {
        const total = (info.row.original.lines ?? []).reduce((s, l) => s + parseFloat(l.quantiteBL || "0"), 0)
        return <span className="text-sm">{total > 0 ? total.toFixed(3) : "—"}</span>
      },
    },
    {
      id: "resteQte", header: "Reste Qté",
      cell: (info) => {
        const lines = info.row.original.lines ?? []
        const total = lines.reduce((s, l) => s + parseFloat(l.resteQuantite || "0"), 0)
        const value = total.toFixed(3)
        const restClass = total === 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"
        return <span className={`text-sm ${restClass}`}>{value}</span>
      },
    },
    {
      id: "fact", header: "Fact",
      cell: (info) => {
        const nums = (info.row.original.lines ?? []).map((l) => l.invoiceNumero).filter(Boolean)
        return <div className="flex flex-col gap-0.5">{nums.length > 0 ? nums.map((n, i) => <span key={i} className="text-xs">{n}</span>) : "—"}</div>
      },
    },
    {
      header: "Date Fact", id: "dateFact",
      cell: (info) => {
        const dates = (info.row.original.lines ?? []).map((l) => l.dateFact).filter(Boolean) as string[]
        return <div className="flex flex-col gap-0.5">{dates.length > 0 ? dates.map((d, i) => <span key={i} className="text-xs">{d ? formatDate(d) : ""}</span>) : "—"}</div>
      },
    },
    { accessorKey: "decVente", header: "DEC Vente", cell: (info) => <span className="text-sm">{(info.renderValue() as string) ?? "—"}</span> },
    { accessorKey: "dateDecVente", header: "Date DEC", cell: (info) => { const v = info.renderValue(); return <span className="text-sm">{v ? formatDate(v as Date) : "—"}</span> } },
    { accessorKey: "simultanee", header: "Simultanée", cell: (info) => <span className="text-sm">{(info.renderValue() as string) ?? "—"}</span> },
    { accessorKey: "dateSimultanee", header: "Date Simul.", cell: (info) => { const v = info.renderValue(); return <span className="text-sm">{v ? formatDate(v as Date) : "—"}</span> } },
    { accessorKey: "status", header: "Statut", cell: (info) => statusBadge(info.renderValue() as ExportStatus) },
  ]

  const actionsColumn: ColumnDef<ExportRow> = {
    id: "actions",
    cell: (info) => {
      const exp = info.row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => openEditDialog(exp)}>
              <Pencil className="h-4 w-4 mr-2" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/exports/${exp.id}`} className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Voir détail
              </Link>
            </DropdownMenuItem>
            {exp.status === "BROUILLON" && (
              <DropdownMenuItem onClick={() => updateExport.mutate({ id: exp.id, status: "EN_COURS" }, {
                onSuccess: () => notify.success({ title: `Export ${exp.numero} marqué en cours` }),
                onError: (err) => notify.error({ title: "Changement de statut impossible", error: err, context: "marquage de l'export en cours" }),
              })}>
                <CheckCircle className="h-4 w-4 mr-2" /> Marquer En cours
              </DropdownMenuItem>
            )}
            {exp.status === "EN_COURS" && (
              <DropdownMenuItem onClick={() => updateExport.mutate({ id: exp.id, status: "VALIDE" }, {
                onSuccess: () => notify.success({ title: `Export ${exp.numero} validé` }),
                onError: (err) => notify.error({ title: "Validation impossible", error: err, context: "validation de l'export" }),
              })}>
                <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" /> Valider
              </DropdownMenuItem>
            )}
            {(exp.status === "BROUILLON" || exp.status === "EN_COURS") && (
              <DropdownMenuItem onClick={() => updateExport.mutate({ id: exp.id, status: "ANNULE" }, {
                onSuccess: () => notify.success({ title: `Export ${exp.numero} annulé` }),
                onError: (err) => notify.error({ title: "Annulation impossible", error: err, context: "annulation de l'export" }),
              })}>
                <XCircle className="h-4 w-4 mr-2 text-red-500" /> Annuler
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => deleteExport.mutate(exp.id, {
              onSuccess: () => notify.success({ title: `Export ${exp.numero} supprimé` }),
              onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression de l'export" }),
            })}>
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }

  return [...columns, actionsColumn]
}
