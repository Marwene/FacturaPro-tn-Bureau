"use client"

import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/status-badge"
import type { OrdreAvecProduct, SerializedOrdreFabrication } from "@/lib/types"
import {
  NEXT_STATUT,
  buildOFDetailsMatrix,
  ofTailleTotal,
  parseOFDetails,
} from "@/components/atelier/ordres-fabrication-logic"
import { Calendar, ChevronDown, ChevronRight, FileText, Loader2, Package, Pencil, Trash2 } from "lucide-react"

/**
 * Ligne d'un ordre de fabrication (liste de `ordres-fabrication-client.tsx`,
 * lot I « découpage des gros composants ») : en-tête + actions + tableau
 * taille × couleur dépliable. Rendu identique à l'ex-composant monolithique.
 */

type OrdreFabricationItemProps = {
  ordre: OrdreAvecProduct
  expanded: boolean
  updatePending: boolean
  fichePending: boolean
  onToggleExpand: () => void
  onStatusChange: (ordre: SerializedOrdreFabrication) => void
  onEdit: (ordre: SerializedOrdreFabrication) => void
  onDelete: (ordre: SerializedOrdreFabrication) => void
  onOpenFiche: (id: string) => void
}

export function OrdreFabricationItem({
  ordre,
  expanded,
  updatePending,
  fichePending,
  onToggleExpand,
  onStatusChange,
  onEdit,
  onDelete,
  onOpenFiche,
}: OrdreFabricationItemProps) {
  const o = ordre
  const hasDetails = Array.isArray(o.details) && o.details.length > 0
  const isExpanded = expanded
  const nextAction = NEXT_STATUT[o.statut]

  function renderDetails() {
    const details = parseOFDetails(o.details)
    if (!details || details.length === 0) return null

    const { tailles, couleurs, grid } = buildOFDetailsMatrix(details)

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
              const rowTotal = ofTailleTotal(details, taille)
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
    <div className="overflow-hidden rounded-lg border transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-3 p-3">
        {hasDetails && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onToggleExpand}>
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
              onClick={() => onStatusChange(o)}
              disabled={updatePending}
            >
              <nextAction.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{nextAction.label}</span>
            </Button>
          )}

          {/* Edit (only for BROUILLON / CONFIRME) */}
          {(o.statut === "BROUILLON" || o.statut === "CONFIRME") && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(o)} title="Modifier">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Fiche technique */}
          {fichePending ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenFiche(o.id)} title="Fiche technique">
              <FileText className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Delete (only for BROUILLON / ANNULE) */}
          {(o.statut === "BROUILLON" || o.statut === "ANNULE") && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(o)} title="Supprimer">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {isExpanded && hasDetails && renderDetails()}
    </div>
  )
}
