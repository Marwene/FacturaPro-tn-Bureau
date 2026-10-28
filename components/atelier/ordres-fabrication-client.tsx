"use client"

import { useState } from "react"
import { useOrdresFabrication, useOrdreFabricationMutations } from "@/hooks/use-ordres-fabrication"
import type { SerializedOrdreFabrication, OrdreAvecProduct } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Plus, Package } from "lucide-react"
import { NouveauOFDialog } from "./nouveau-of-dialog"
import { STATUTS, STATUT_LABEL, NEXT_STATUT } from "./ordres-fabrication-logic"
import { OrdreFabricationItem } from "./ordres-fabrication-item"

/**
 * Façade Atelier / Ordres de fabrication (lot I « découpage des gros
 * composants », limite 250 lignes) : état + hooks + dialogs.
 * Ligne de liste → `ordres-fabrication-item.tsx`, logique pure →
 * `ordres-fabrication-logic.ts`. Export et props inchangés.
 */
export function OrdresFabricationClient() {
  const [statutFilter, setStatutFilter] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editOrdre, setEditOrdre] = useState<SerializedOrdreFabrication | null>(null)
  const [deleteOrdre, setDeleteOrdre] = useState<SerializedOrdreFabrication | null>(null)
  const [statusOrdre, setStatusOrdre] = useState<SerializedOrdreFabrication | null>(null)
  const { data, isLoading } = useOrdresFabrication(statutFilter)
  const { update, remove, genererFiche, openFicheTechnique } = useOrdreFabricationMutations()
  const ordres: OrdreAvecProduct[] = data?.ordres ?? []

  // Edit form state
  const [editQuantite, setEditQuantite] = useState("")
  const [editDateLivraison, setEditDateLivraison] = useState("")
  const [editNotes, setEditNotes] = useState("")

  function openEdit(o: SerializedOrdreFabrication) {
    setEditOrdre(o)
    setEditQuantite(String(o.quantite))
    const livraison: unknown = o.dateLivraison
    setEditDateLivraison(typeof livraison === "string" ? livraison.slice(0, 10) : "")
    setEditNotes(o.notes ?? "")
  }

  async function handleEditSave() {
    if (!editOrdre) return
    await update.mutateAsync({
      id: editOrdre.id,
      data: {
        quantite: parseInt(editQuantite) || 1,
        dateLivraison: editDateLivraison || null,
        notes: editNotes || null,
      },
    })
    setEditOrdre(null)
  }

  async function handleDelete() {
    if (!deleteOrdre) return
    await remove.mutateAsync(deleteOrdre.id)
    setDeleteOrdre(null)
  }

  async function handleStatusChange(o: SerializedOrdreFabrication, newStatut: string) {
    await update.mutateAsync({ id: o.id, data: { statut: newStatut } })
    setStatusOrdre(null)
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
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouvel OF
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Chargement...</div>
      ) : ordres.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Package className="h-8 w-8" />
          Aucun ordre de fabrication
        </div>
      ) : (
        <div className="space-y-2">
          {ordres.map((o) => (
            <OrdreFabricationItem
              key={o.id}
              ordre={o}
              expanded={expanded === o.id}
              updatePending={update.isPending}
              fichePending={genererFiche.isPending && genererFiche.variables === o.id}
              onToggleExpand={() => setExpanded(expanded === o.id ? null : o.id)}
              onStatusChange={setStatusOrdre}
              onEdit={openEdit}
              onDelete={setDeleteOrdre}
              onOpenFiche={openFicheTechnique}
            />
          ))}
        </div>
      )}

      <NouveauOFDialog open={showNew} onOpenChange={setShowNew} />

      {/* Edit dialog */}
      <Dialog open={!!editOrdre} onOpenChange={(open) => { if (!open) setEditOrdre(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Modifier l&apos;OF</DialogTitle>
            <DialogDescription className="text-xs">{editOrdre?.code}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Quantité</Label>
              <Input type="number" min={1} value={editQuantite} onChange={(e) => setEditQuantite(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Date livraison</Label>
              <Input type="date" value={editDateLivraison} onChange={(e) => setEditDateLivraison(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="h-8 text-sm" placeholder="Optionnelle" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditOrdre(null)}>Annuler</Button>
            <Button size="sm" onClick={handleEditSave} disabled={update.isPending}>
              {update.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteOrdre}
        onOpenChange={(open) => { if (!open) setDeleteOrdre(null) }}
        onConfirm={handleDelete}
        title="Supprimer l'OF ?"
        description={`Êtes-vous sûr de vouloir supprimer ${deleteOrdre?.code ?? ""} ? Cette action est irréversible.`}
        isLoading={remove.isPending}
      />

      {/* Status change confirmation */}
      <AlertDialog open={!!statusOrdre} onOpenChange={(open) => { if (!open) setStatusOrdre(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le statut</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const next = statusOrdre && NEXT_STATUT[statusOrdre.statut]
                return next
                  ? <>Passer {statusOrdre.code} de <strong>{STATUT_LABEL[statusOrdre.statut]}</strong> à <strong>{STATUT_LABEL[next.statut]}</strong> ?</>
                  : "Confirmer le changement de statut ?"
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const next = statusOrdre && NEXT_STATUT[statusOrdre.statut]
              if (next) handleStatusChange(statusOrdre, next.statut)
            }}>
              {update.isPending ? "Mise à jour..." : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
