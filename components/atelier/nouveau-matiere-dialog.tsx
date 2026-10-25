"use client"

import { useState } from "react"
import { useMatierePremiereMutations } from "@/hooks/use-matieres-premieres"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const MATIERE_TYPES = [
  "TISSU", "FIL", "BOUTON", "FERMETURE", "GARNITURE", "ETIQUETTE", "EMBALLAGE", "AUTRE",
]
const UNITES = ["M", "Kg", "Piece", "Rouleau", "Lot"]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NouveauMatiereDialog({ open, onOpenChange }: Props) {
  const [code, setCode] = useState("")
  const [nom, setNom] = useState("")
  const [type, setType] = useState("TISSU")
  const [unite, setUnite] = useState("M")
  const [prixUnitaire, setPrixUnitaire] = useState("0")
  const [stockActuel, setStockActuel] = useState("0")
  const [stockMinimum, setStockMinimum] = useState("0")
  const [description, setDescription] = useState("")
  const { create } = useMatierePremiereMutations()
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!code || !nom) return
    setLoading(true)
    try {
      await create.mutateAsync({
        code, nom, type, unite,
        prixUnitaire: parseFloat(prixUnitaire) || 0,
        stockActuel: parseFloat(stockActuel) || 0,
        stockMinimum: parseFloat(stockMinimum) || 0,
        description: description || null,
      })
      onOpenChange(false)
      setCode(""); setNom(""); setPrixUnitaire("0"); setStockActuel("0"); setStockMinimum("0"); setDescription("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">Nouvelle matière première</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} className="h-8 text-sm" placeholder="MAT-001" />
            </div>
            <div>
              <Label className="text-xs">Nom</Label>
              <Input value={nom} onChange={(e) => setNom(e.target.value)} className="h-8 text-sm" placeholder="Tissu coton" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs">
                {MATIERE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Unité</Label>
              <select value={unite} onChange={(e) => setUnite(e.target.value)} className="mt-1 flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs">
                {UNITES.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Prix unitaire</Label>
              <Input type="number" value={prixUnitaire} onChange={(e) => setPrixUnitaire(e.target.value)} className="h-8 text-sm" step="0.001" />
            </div>
            <div>
              <Label className="text-xs">Stock actuel</Label>
              <Input type="number" value={stockActuel} onChange={(e) => setStockActuel(e.target.value)} className="h-8 text-sm" step="0.01" />
            </div>
            <div>
              <Label className="text-xs">Stock minimum</Label>
              <Input type="number" value={stockMinimum} onChange={(e) => setStockMinimum(e.target.value)} className="h-8 text-sm" step="0.01" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8 text-sm" placeholder="Optionnelle" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="button" size="sm" onClick={handleSubmit} disabled={loading || !code || !nom}>
            {loading ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
