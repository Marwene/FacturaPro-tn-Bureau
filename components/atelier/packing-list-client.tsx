"use client"

import { useState, useMemo } from "react"
import { usePackingLists, usePackingListMutations } from "@/hooks/use-packing-list"
import { useOrdresFabrication } from "@/hooks/use-ordres-fabrication"
import { useCartonTypes } from "@/hooks/use-carton-types"
import { repartirParTailles, validerColisage, type CartonType } from "@/lib/packing-list/colisage"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Boxes, FileText, Tag, Loader2, Trash2, CheckCircle2, XCircle, Printer } from "lucide-react"
import { notify } from "@/lib/notify"
import type { PackingOFDetail } from "@/lib/types"

interface CartonEdit {
  numero: number
  contenu: Record<string, number>
  typeNom?: string
  capacite?: number
}

interface OrdreFabrication {
  id: string
  code: string
  statut: string
  quantite: number
  product?: { nom?: string | null } | null
  tiers?: { raisonSociale?: string | null } | null
  details?: Array<{ taille?: string; quantite?: number }>
}

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

function getDemande(ordre: OrdreFabrication | null): PackingOFDetail[] {
  if (!ordre?.details || ordre.details.length === 0) {
    return [{ taille: "Std", quantite: Math.max(0, Math.floor(ordre?.quantite ?? 0)) }]
  }
  const map = new Map<string, number>()
  for (const d of ordre.details) {
    const taille = d.taille || "Std"
    const q = Math.max(0, Math.floor(d.quantite ?? 0))
    if (q > 0) map.set(taille, (map.get(taille) ?? 0) + q)
  }
  return Array.from(map.entries()).map(([taille, quantite]) => ({ taille, quantite }))
}

function NouveauColisageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: ordresData } = useOrdresFabrication()
  const { create } = usePackingListMutations()
  const { data: cartonTypesData } = useCartonTypes()

  const ordres = useMemo(
    () => (ordresData?.ordres ?? []) as OrdreFabrication[],
    [ordresData]
  )
  const filteredOrdres = useMemo(
    () => ordres.filter((o) => !["BROUILLON", "ANNULE"].includes(o.statut)),
    [ordres]
  )

  const cartonTypesConfig: CartonType[] = useMemo(
    () => (cartonTypesData?.cartonTypes ?? []) as CartonType[],
    [cartonTypesData]
  )

  const [ordreId, setOrdreId] = useState("")
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([])
  const [cartons, setCartons] = useState<CartonEdit[]>([])
  const [notes, setNotes] = useState("")
  const [touched, setTouched] = useState(false)

  const ordre = useMemo(
    () => filteredOrdres.find((o) => o.id === ordreId) ?? null,
    [filteredOrdres, ordreId]
  )
  const demande = useMemo(() => (ordre ? getDemande(ordre) : []), [ordre])
  const tailles = useMemo(
    () =>
      Array.from(new Set(demande.map((d) => d.taille))).sort((a, b) =>
        a.localeCompare(b, "fr", { numeric: true })
      ),
    [demande]
  )

  // Types sélectionnés (tous par défaut si aucune sélection explicite).
  // selectedTypes ne doit JAMAIS être vide : si le filtrage par selectedTypeIds
  // ne retourne rien, on retombe sur tous les types configurés, sinon sur le fallback.
  const selectedTypes = useMemo(() => {
    const all = cartonTypesConfig.length > 0 ? cartonTypesConfig : [{ id: "defaut", nom: "Carton", capacite: 24 }]
    if (selectedTypeIds.length > 0) {
      const filtered = all.filter((t) => selectedTypeIds.includes(t.id))
      if (filtered.length > 0) return filtered
    }
    return all
  }, [cartonTypesConfig, selectedTypeIds])

  // Répartition de base automatique : recalculée dès que l'OF, les types
  // sélectionnés, la config de cartons ou la demande évoluent. Ajustement au
  // rendu (React « storing information from previous renders ») et non
  // useEffect : mêmes déclencheurs que l'ancien effet ([open, ordre,
  // demandeKey, selectedTypes]) — sentinel `null` au montage pour consommer le
  // premier passage (l'ancien effet tournait aussi au montage), écritures
  // seulement si le dialog est ouvert ET qu'un OF est sélectionné (même garde
  // `if (!open || !ordre) return`), donc aucun reset quand le dialog est fermé.
  const demandeKey = JSON.stringify(demande)
  const [prevRep, setPrevRep] = useState<{ open: boolean; ordre: OrdreFabrication | null; key: string; types: CartonType[] } | null>(null)
  if (
    prevRep === null ||
    prevRep.open !== open ||
    prevRep.ordre !== ordre ||
    prevRep.key !== demandeKey ||
    prevRep.types !== selectedTypes
  ) {
    setPrevRep({ open, ordre, key: demandeKey, types: selectedTypes })
    if (open && ordre) {
      const base = repartirParTailles(demande, selectedTypes, [])
      setCartons(
        base.cartons.map((c) => ({
          numero: c.numero,
          contenu: { ...c.contenu },
          typeNom: c.typeNom,
          capacite: c.capacite,
        }))
      )
      setTouched(false)
    }
  }

  const validation = useMemo(() => {
    return validerColisage(demande, cartons.map((c) => ({ contenu: c.contenu })))
  }, [demande, cartons])

  const totalDistribue = cartons.reduce((s, c) => {
    return s + Object.values(c.contenu).reduce((a, b) => a + b, 0)
  }, 0)

  function setCell(cartonNumero: number, taille: string, value: string) {
    setTouched(true)
    const q = Math.max(0, parseInt(value) || 0)
    setCartons((prev) =>
      prev.map((c) => (c.numero === cartonNumero ? { ...c, contenu: { ...c.contenu, [taille]: q } } : c))
    )
  }

  async function handleCreate() {
    if (!ordre) return
    const maxCap = selectedTypes.reduce((m, t) => Math.max(m, t.capacite), 0)
    try {
      await create.mutateAsync({
        ordreId,
        capaciteCarton: maxCap,
        cartonTypes: selectedTypes.map((t) => ({ id: t.id, nom: t.nom, capacite: t.capacite })),
        cartonsManuels: cartons.map((c) => ({ contenu: c.contenu })),
        notes: notes || null,
      })
      onOpenChange(false)
      setOrdreId("")
      setNotes("")
      notify.success({ title: "Colisage généré", description: "Le packing list est prêt à être imprimé." })
    } catch (err: unknown) {
      notify.error({ title: "Colisage non généré", error: err, context: "génération du colisage" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Nouveau colisage</DialogTitle>
          <DialogDescription className="text-xs">
            Sélectionnez un ordre de fabrication puis répartissez les quantités par carton.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <Label className="text-xs">Ordre de fabrication</Label>
            <select
              value={ordreId}
              onChange={(e) => setOrdreId(e.target.value)}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
            >
              <option value="">Sélectionner un OF...</option>
              {filteredOrdres.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} — {o.product?.nom ?? "Produit"}
                  {o.tiers ? ` — ${o.tiers.raisonSociale}` : ""}
                </option>
              ))}
            </select>
          </div>

          {ordre && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Client</Label>
                <div className="mt-1 h-8 rounded-md border border-input px-2 py-1.5 text-xs truncate">
                  {ordre.tiers?.raisonSociale ?? "—"}
                </div>
              </div>
              <div>
                <Label className="text-xs">Modèle</Label>
                <div className="mt-1 h-8 rounded-md border border-input px-2 py-1.5 text-xs truncate">
                  {ordre.product?.nom ?? "—"}
                </div>
              </div>
              <div>
                <Label className="text-xs">Répartition</Label>
                <div className="mt-1 h-8 rounded-md border border-input px-2 py-1.5 text-xs truncate">
                  {selectedTypes.length > 0
                    ? `${selectedTypes.map((t) => `${t.nom} (${t.capacite} p.)`).join(" · ")} · ${selectedTypes.length} type${selectedTypes.length > 1 ? "s" : ""} · max ${selectedTypes.reduce((m, t) => Math.max(m, t.capacite), 0)} p/carton`
                    : "Aucun type"
                  }
                </div>
              </div>
            </div>
          )}

          {ordre && cartonTypesConfig.length > 0 && (
            <div>
              <Label className="text-xs">Types de cartons disponibles</Label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {cartonTypesConfig.map((t) => {
                  const checked = selectedTypeIds.includes(t.id)
                  const dims = t.longueur && t.largeur && t.hauteur
                    ? ` — ${t.longueur}×${t.largeur}×${t.hauteur} mm`
                    : ""
                  return (
                    <label
                      key={t.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          setSelectedTypeIds((prev) => {
                            const base = prev.length > 0 ? prev : cartonTypesConfig.map((x) => x.id)
                            const next = v ? [...base, t.id] : base.filter((id) => id !== t.id)
                            return next.length > 0 ? next : base
                          })
                        }}
                      />
                      <span className="font-medium">{t.nom}</span>
                      <span className="text-muted-foreground">({t.capacite} p.{dims})</span>
                    </label>
                  )
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                L&apos;optimisation automatique minimise le nombre de cartons et répartit les tailles de façon équilibrée.
              </p>
            </div>
          )}

          {ordre && cartons.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="p-1.5 text-left font-medium min-w-[80px]">N° Carton</th>
                    <th className="p-1.5 text-left font-medium min-w-[120px]">Type</th>
                    {tailles.map((t) => (
                      <th key={t} className="p-1.5 text-center font-medium min-w-[64px]">{t}</th>
                    ))}
                    <th className="p-1.5 text-center font-medium min-w-[64px]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {cartons.map((c) => {
                    const total = Object.values(c.contenu).reduce((a, b) => a + b, 0)
                    const typeLabel = c.typeNom ? `${c.typeNom} (${c.capacite} p.)` : "—"
                    return (
                      <tr key={c.numero} className="border-b border-muted/30">
                        <td className="p-1.5 font-medium">
                          {c.numero}/{cartons.length}
                        </td>
                        <td className="p-1.5 text-left">{typeLabel}</td>
                        {tailles.map((t) => (
                          <td key={t} className="p-1 text-center">
                            <Input
                              type="number"
                              min={0}
                              value={c.contenu[t] ?? 0}
                              onChange={(e) => setCell(c.numero, t, e.target.value)}
                              className="h-7 w-full text-center text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </td>
                        ))}
                        <td className="p-1.5 text-center font-semibold">{total}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="p-1.5 text-left font-semibold text-muted-foreground">Total</td>
                    <td className="p-1.5 text-left text-muted-foreground">—</td>
                    {tailles.map((t) => (
                      <td key={t} className="p-1.5 text-center font-semibold">
                        {cartons.reduce((s, c) => s + (c.contenu[t] ?? 0), 0)}
                      </td>
                    ))}
                    <td className="p-1.5 text-center font-semibold">{totalDistribue}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {ordre && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs">
                {validation.ok ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Colisage cohérent — {cartons.length} carton{cartons.length > 1 ? "s" : ""}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="h-3.5 w-3.5" />
                    {validation.erreurs[0] ?? "Colisage incohérent"}
                  </span>
                )}
                {touched && (
                  <span className="text-muted-foreground">(répartition modifiée manuellement)</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  const base = repartirParTailles(demande, selectedTypes, [])
                  setCartons(
                    base.cartons.map((c) => ({
                      numero: c.numero,
                      contenu: { ...c.contenu },
                      typeNom: c.typeNom,
                      capacite: c.capacite,
                    }))
                  )
                  setTouched(false)
                  notify.success({ title: "Répartition automatique appliquée", description: `${base.cartons.length} cartons — ${base.totalPieces} pièces.` })
                }}
                disabled={!ordre}
              >
                Répartir automatiquement
              </Button>
            </div>
          )}

          <div>
            <Label className="text-xs">Notes (optionnel)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 h-8 text-xs" placeholder="Optionnelle" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button size="sm" onClick={handleCreate} disabled={!ordre || !validation.ok || create.isPending}>
            {create.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Génération...
              </>
            ) : (
              "Générer le colisage"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
