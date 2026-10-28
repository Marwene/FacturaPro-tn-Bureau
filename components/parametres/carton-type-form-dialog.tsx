import type { CartonType } from "@/hooks/use-carton-types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CartonTypeForm } from "@/lib/carton-type-form"
import { Loader2 } from "lucide-react"

interface CartonTypeFormDialogProps {
  open: boolean
  editing: CartonType | null
  form: CartonTypeForm
  onFormChange: (updater: (previous: CartonTypeForm) => CartonTypeForm) => void
  onClose: () => void
  onSubmit: () => void
  isMutating: boolean
}

export function CartonTypeFormDialog({
  open,
  editing,
  form,
  onFormChange,
  onClose,
  onSubmit,
  isMutating,
}: CartonTypeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base">
            {editing ? "Modifier le type de carton" : "Ajouter un type de carton"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="carton-nom" className="text-xs">Nom</Label>
            <Input
              id="carton-nom"
              value={form.nom}
              onChange={(e) => onFormChange((f) => ({ ...f, nom: e.target.value }))}
              placeholder="Ex : Format A9, Format A12..."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="carton-capacite" className="text-xs">Capacité (pièces)</Label>
              <Input
                id="carton-capacite"
                type="number"
                min={1}
                value={form.capacite}
                onChange={(e) => onFormChange((f) => ({ ...f, capacite: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carton-longueur" className="text-xs">Longueur (mm)</Label>
              <Input
                id="carton-longueur"
                type="number"
                min={0}
                value={form.longueur}
                onChange={(e) => onFormChange((f) => ({ ...f, longueur: e.target.value }))}
                placeholder="600"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carton-largeur" className="text-xs">Largeur (mm)</Label>
              <Input
                id="carton-largeur"
                type="number"
                min={0}
                value={form.largeur}
                onChange={(e) => onFormChange((f) => ({ ...f, largeur: e.target.value }))}
                placeholder="400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carton-hauteur" className="text-xs">Hauteur (mm)</Label>
              <Input
                id="carton-hauteur"
                type="number"
                min={0}
                value={form.hauteur}
                onChange={(e) => onFormChange((f) => ({ ...f, hauteur: e.target.value }))}
                placeholder="300"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isMutating}>Annuler</Button>
          <Button onClick={onSubmit} disabled={isMutating}>
            {isMutating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enregistrement...
              </>
            ) : editing ? (
              "Modifier"
            ) : (
              "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
