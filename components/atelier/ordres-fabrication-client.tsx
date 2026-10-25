"use client"

import { useState } from "react"
import { useOrdresFabrication, useOrdreFabricationMutations } from "@/hooks/use-ordres-fabrication"
import type { SerializedOrdreFabrication, OrdreAvecProduct, OFDetailLine } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
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
import { Plus, Package, Calendar, FileText, Loader2, ChevronDown, ChevronRight, CheckCircle, Pencil, Trash2, Play } from "lucide-react"
import { NouveauOFDialog } from "./nouveau-of-dialog"

const STATUTS = [
  { value: "", label: "Tous", color: "default" },
  { value: "BROUILLON", label: "Brouillon", color: "secondary" },
  { value: "CONFIRME", label: "Confirmé", color: "default" },
  { value: "EN_COURS", label: "En cours", color: "destructive" },
  { value: "TERMINE", label: "Terminé", color: "outline" },
  { value: "ANNULE", label: "Annulé", color: "outline" },
] as const

const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  CONFIRME: "Confirmé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
}

const NEXT_STATUT: Record<string, { label: string; statut: string; icon: React.ReactNode } | null> = {
  BROUILLON: { label: "Confirmer", statut: "CONFIRME", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  CONFIRME: { label: "Lancer", statut: "EN_COURS", icon: <Play className="h-3.5 w-3.5" /> },
  EN_COURS: { label: "Terminer", statut: "TERMINE", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  TERMINE: null,
  ANNULE: null,
}

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

  // ---- Detail render ----
  function isOFDetail(v: unknown): v is OFDetailLine {
    return (
      typeof v === "object" &&
      v !== null &&
      "variantId" in v &&
      typeof v.variantId === "string" &&
      "variantNom" in v &&
      typeof v.variantNom === "string" &&
      "quantite" in v &&
      typeof v.quantite === "number" &&
      (!("taille" in v) || v.taille === undefined || typeof v.taille === "string") &&
      (!("couleur" in v) || v.couleur === undefined || typeof v.couleur === "string") &&
      (!("quantiteProduite" in v) || v.quantiteProduite === undefined || typeof v.quantiteProduite === "number")
    )
  }

  function renderDetails(o: SerializedOrdreFabrication) {
    const details: OFDetailLine[] | null = Array.isArray(o.details) && o.details.every(isOFDetail) ? o.details : null
    if (!details || details.length === 0) return null

    const tailles = [...new Set(details.map((d) => d.taille))]
    const couleurs = [...new Set(details.map((d) => d.couleur))]
    const grid: Record<string, Record<string, OFDetailLine>> = {}
    for (const d of details) {
      if (!grid[d.taille]) grid[d.taille] = {}
      grid[d.taille][d.couleur] = d
    }

    return (
      <div className="px-3 pb-3 pt-0">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-1 text-left font-medium">Taille</th>
              {couleurs.map((c) => <th key={c} className="p-1 text-center font-medium">{c}</th>)}
              <th className="p-1 text-center font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {tailles.map((taille) => {
              const rowTotal = details.filter((d) => d.taille === taille).reduce((s, d) => s + d.quantite, 0)
              return (
                <tr key={taille} className="border-b border-muted/30">
                  <td className="p-1 font-medium">{taille}</td>
                  {couleurs.map((couleur) => {
                    const d = grid[taille]?.[couleur]
                    return (
                      <td key={couleur} className="p-1 text-center">
                        {d ? <span>{d.quantite}{d.quantiteProduite > 0 ? <span className="text-muted-foreground"> / {d.quantiteProduite}</span> : ""}</span> : "—"}
                      </td>
                    )
                  })}
                  <td className="p-1 text-center font-semibold">{rowTotal}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
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
          {ordres.map((o) => {
            const hasDetails = Array.isArray(o.details) && o.details.length > 0
            const isExpanded = expanded === o.id
            const nextAction = NEXT_STATUT[o.statut]

            return (
              <div key={o.id} className="overflow-hidden rounded-lg border transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-3 p-3">
                  {hasDetails && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setExpanded(isExpanded ? null : o.id)}>
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{o.code}</span>
                        <StatusBadge type="ordre-fabrication" status={o.statut} className="text-[10px] shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{o.product?.nom ?? "Produit"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {o.dateLivraison ? new Date(o.dateLivraison).toLocaleDateString("fr-FR") : "—"}
                    </span>
                    <span className="font-medium">{o.quantite} pièce{(o.quantite as number) > 1 ? "s" : ""}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Status change */}
                    {nextAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => setStatusOrdre(o)}
                        disabled={update.isPending}
                      >
                        {nextAction.icon}
                        <span className="hidden sm:inline">{nextAction.label}</span>
                      </Button>
                    )}

                    {/* Edit (only for BROUILLON / CONFIRME) */}
                    {(o.statut === "BROUILLON" || o.statut === "CONFIRME") && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(o)} title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Fiche technique */}
                    {genererFiche.isPending && genererFiche.variables === o.id ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openFicheTechnique(o.id)} title="Fiche technique">
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {/* Delete (only for BROUILLON / ANNULE) */}
                    {(o.statut === "BROUILLON" || o.statut === "ANNULE") && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteOrdre(o)} title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {isExpanded && hasDetails && renderDetails(o)}
              </div>
            )
          })}
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
