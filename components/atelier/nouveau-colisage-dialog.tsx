"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { repartirParTailles } from "@/lib/packing-list/colisage"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { notify } from "@/lib/notify"
import { useNouveauColisage } from "./use-nouveau-colisage"

export function NouveauColisageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const colisage = useNouveauColisage({ open, onOpenChange })
  const { filteredOrdres, ordre, ordreId, setOrdreId, cartonTypesConfig, selectedTypeIds, setSelectedTypeIds } = colisage
  const { cartons, setCartons, setCell, tailles, totalDistribue, validation, touched } = colisage
  const { selectedTypes, demande, setTouched, notes, setNotes, handleCreate, create } = colisage

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
