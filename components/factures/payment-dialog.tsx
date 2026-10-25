"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/shared/form-field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { formatTND } from "@/lib/decimal"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  maxAmount: string
  form: {
    montant: string
    methode: string
    reference: string
    dateReglement: string
    notes: string
  }
  onFieldChange: (field: string, value: string) => void
  onSubmit: () => void
  isPending: boolean
}

export function PaymentDialog({
  open,
  onOpenChange,
  maxAmount,
  form,
  onFieldChange,
  onSubmit,
  isPending,
}: PaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Enregistrer un Paiement</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <FormField label="Montant (DT)" className="gap-1">
            <Input
              type="text"
              inputMode="decimal"
              value={form.montant ? formatTND(form.montant) : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".")
                onFieldChange("montant", raw)
              }}
              placeholder={`Max: ${formatTND(maxAmount)}`}
              className="h-8 text-sm"
            />
          </FormField>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs">Mode de Paiement</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground p-0.5" aria-label="Info">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start" className="max-w-xs">
                    <p className="text-xs">Pour payer par chèque ou effet, utilisez le module <strong>Chèques/Effets</strong> depuis le menu principal.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Select value={form.methode} onValueChange={(v) => onFieldChange("methode", v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["ESPECES", "VIREMENT", "CARTE"].map((m) => (
                  <SelectItem key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormField label="Référence" className="gap-1">
            <Input
              value={form.reference}
              onChange={(e) => onFieldChange("reference", e.target.value)}
              placeholder="Référence virement, transaction..."
              className="h-8 text-sm"
            />
          </FormField>
          <FormField label="Date de Règlement" className="gap-1">
            <Input
              type="date"
              value={form.dateReglement}
              onChange={(e) => onFieldChange("dateReglement", e.target.value)}
              className="h-8 text-sm"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button size="sm" onClick={onSubmit} disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
