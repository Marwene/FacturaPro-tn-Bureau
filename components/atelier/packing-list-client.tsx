"use client"

import { useState } from "react"
import { usePackingLists, usePackingListMutations } from "@/hooks/use-packing-list"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Boxes, FileText, Tag, Trash2, Printer } from "lucide-react"
import { notify } from "@/lib/notify"
import { NouveauColisageDialog } from "./nouveau-colisage-dialog"

interface PackingList {
  id: string
  numero: string
  nbCartons: number
  totalPieces: number
  statut: string
  ordre?: {
    code?: string | null
    product?: { nom?: string | null } | null
    tiers?: { raisonSociale?: string | null } | null
  } | null
}

export function PackingListClient() {
  const [showNew, setShowNew] = useState(false)
  const [statutFilter, setStatutFilter] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<PackingList | null>(null)
  const { data, isLoading } = usePackingLists(statutFilter)
  const { remove, openPdf, openEtiquettes } = usePackingListMutations()
  const packingLists = (data?.packingLists ?? []) as PackingList[]

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      notify.success({ title: `Colisage ${deleteTarget.numero} supprimé` })
    } catch (err: unknown) {
      notify.error({ title: "Suppression impossible", error: err, context: "suppression du colisage" })
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="GENERE">Généré</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="ANNULE">Annulé</option>
          </select>
        </div>
        <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouveau colisage
        </Button>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Chargement...</div>
      ) : packingLists.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Boxes className="h-8 w-8" />
          Aucun colisage généré
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">N°</th>
                <th className="p-3 font-medium">OF</th>
                <th className="p-3 font-medium">Client</th>
                <th className="p-3 font-medium">Modèle</th>
                <th className="p-3 text-center font-medium">Colis</th>
                <th className="p-3 text-center font-medium">Pièces</th>
                <th className="p-3 text-center font-medium">Statut</th>
                <th className="p-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {packingLists.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{p.numero}</td>
                  <td className="p-3">{p.ordre?.code ?? "—"}</td>
                  <td className="p-3">{p.ordre?.tiers?.raisonSociale ?? "—"}</td>
                  <td className="p-3">{p.ordre?.product?.nom ?? "—"}</td>
                  <td className="p-3 text-center">{p.nbCartons}</td>
                  <td className="p-3 text-center">{p.totalPieces}</td>
                  <td className="p-3 text-center">
                    <StatusBadge type="packing-list" status={p.statut} className="text-[10px]" />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]">
                            <Printer className="h-3.5 w-3.5" />
                            Imprimer
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openPdf(p.id)}>
                            <FileText className="h-3.5 w-3.5" />
                            Packing List (A4)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEtiquettes(p.id, "tsc200")}>
                            <Tag className="h-3.5 w-3.5" />
                            Étiquettes — TSC T200
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEtiquettes(p.id, "a4")}>
                            <Tag className="h-3.5 w-3.5" />
                            Étiquettes — Imprimante système (A4)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)} title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NouveauColisageDialog open={showNew} onOpenChange={setShowNew} />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={handleDelete}
        title="Supprimer le colisage ?"
        description={`Êtes-vous sûr de vouloir supprimer ${deleteTarget?.numero ?? ""} ? Cette action est irréversible.`}
        isLoading={remove.isPending}
      />
    </div>
  )
}
