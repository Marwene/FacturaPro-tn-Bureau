"use client"

import { useState } from "react"
import { useMatieresPremieres, useMatierePremiereMutations } from "@/hooks/use-matieres-premieres"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Pencil, Trash2, Package, ScrollText } from "lucide-react"
import { NouveauMatiereDialog } from "./nouveau-matiere-dialog"

const MATIERE_TYPES = [
  { value: "", label: "Tous" },
  { value: "TISSU", label: "Tissu" },
  { value: "FIL", label: "Fil" },
  { value: "BOUTON", label: "Bouton" },
  { value: "FERMETURE", label: "Fermeture" },
  { value: "GARNITURE", label: "Garniture" },
  { value: "ETIQUETTE", label: "Étiquette" },
  { value: "EMBALLAGE", label: "Emballage" },
  { value: "AUTRE", label: "Autre" },
]

export function MatieresPremieresClient() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [showNew, setShowNew] = useState(false)
  const { data, isLoading } = useMatieresPremieres(typeFilter, search)
  const { remove } = useMatierePremiereMutations()
  const matieres = data?.matieres ?? []

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          {MATIERE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle matière
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Chargement...</div>
      ) : matieres.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Package className="h-8 w-8" />
          Aucune matière première
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matieres.map((m) => (
            <div key={m.id} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{m.nom}</p>
                    <p className="text-xs text-muted-foreground">{m.code}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Stock : <strong>{Number(m.stockActuel).toFixed(2)} {m.unite}</strong></span>
                <span>Prix : <strong>{Number(m.prixUnitaire).toFixed(3)} TND/{m.unite}</strong></span>
              </div>
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(m.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <NouveauMatiereDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  )
}
