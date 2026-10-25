"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePendingBLs, useCreateInvoiceFromBL } from "@/hooks/use-pending-bl";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/decimal";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, Loader2 } from "lucide-react";

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  blIds: string[];
}

const invoiceModes = [
  {
    value: "consolidee" as const,
    label: "Facture consolidée",
    description: "Tous les bons de livraison sélectionnés dans une seule facture",
  },
  {
    value: "par_bl" as const,
    label: "Facture par Bon de livraison",
    description: "Une facture distincte par bon de livraison sélectionné",
  },
];

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  blIds,
}: GenerateInvoiceDialogProps) {
  const { data } = usePendingBLs();
  const createInvoice = useCreateInvoiceFromBL();
  const [selectedBLIds, setSelectedBLIds] = useState<string[]>(blIds);
  const [dateEmission, setDateEmission] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dateEcheance, setDateEcheance] = useState("");
  const [mode, setMode] = useState<"consolidee" | "par_bl">("consolidee");

  const clientData = data?.clients.find((c) => c.clientId === clientId);
  const selectedBLs = clientData?.bls.filter((bl) => selectedBLIds.includes(bl.id)) ?? [];
  const totalTTC = selectedBLs.reduce((sum, bl) => sum + Number(bl.totalTTC), 0);

  const handleSubmit = () => {
    createInvoice.mutate(
      {
        clientId,
        blIds: selectedBLIds,
        dateEmission,
        dateEcheance: dateEcheance || undefined,
        mode,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const toggleBL = (blId: string) => {
    setSelectedBLIds((prev) =>
      prev.includes(blId) ? prev.filter((id) => id !== blId) : [...prev, blId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Générer une facture pour {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateEmission">Date d&apos;émission</Label>
              <Input
                id="dateEmission"
                type="date"
                value={dateEmission}
                onChange={(e) => setDateEmission(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="dateEcheance">Date d&apos;échéance</Label>
              <Input
                id="dateEcheance"
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Bons de livraison à inclure</Label>
            <div className="mt-2 space-y-2">
              {clientData?.bls.map((bl) => (
                <label
                  key={bl.id}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5"
                >
                  <Checkbox
                    checked={selectedBLIds.includes(bl.id)}
                    onCheckedChange={() => toggleBL(bl.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{bl.numero}</p>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Détails du bon de livraison ${bl.numero}`}
                            className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:bg-muted/80"
                          >
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-96 p-0" side="right">
                          <div className="rounded-lg border border-border overflow-hidden">
                            <div className="bg-muted px-3 py-2 border-b border-border">
                              <p className="text-xs font-semibold text-foreground">
                                BL {bl.numero}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {bl.lines.length} ligne{bl.lines.length > 1 ? "s" : ""}
                              </p>
                            </div>
                            <div className="divide-y divide-border">
                              <div className="grid grid-cols-12 gap-1 px-3 py-1.5 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                <div className="col-span-5">Produit</div>
                                <div className="col-span-2 text-right">Qté</div>
                                <div className="col-span-2 text-right">Prix</div>
                                <div className="col-span-3 text-right">Total</div>
                              </div>
                              {bl.lines.map((line) => (
                                <div
                                  key={line.id}
                                  className="grid grid-cols-12 gap-1 px-3 py-2 hover:bg-muted/30 transition-colors"
                                >
                                  <div className="col-span-5">
                                    <p className="text-xs font-medium text-foreground truncate">
                                      {line.product?.nom ?? line.description}
                                    </p>
                                    {line.product?.code && (
                                      <p className="text-[10px] text-muted-foreground">
                                        {line.product.code}
                                      </p>
                                    )}
                                  </div>
                                  <div className="col-span-2 text-right text-xs tabular-nums text-foreground">
                                    {line.quantite}
                                  </div>
                                  <div className="col-span-2 text-right text-xs tabular-nums text-foreground">
                                    {formatCurrency(line.prixHT)}
                                  </div>
                                  <div className="col-span-3 text-right text-xs font-medium tabular-nums text-foreground">
                                    {formatCurrency(line.totalHT)}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="bg-muted/30 px-3 py-2 border-t border-border">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                  Total HT
                                </span>
                                <span className="text-xs font-bold tabular-nums text-foreground">
                                  {formatCurrency(bl.totalTTC)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bl.dateLivraison
                        ? `Livré le ${new Date(bl.dateLivraison).toLocaleDateString("fr-FR")}`
                        : "Date inconnue"}
                    </p>
                  </div>
                  <p className="text-sm font-medium">
                    {formatCurrency(bl.totalTTC)}
                  </p>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label id="invoice-mode-label">Type de facture</Label>
            <RadioGroup
              value={mode}
              onValueChange={(value) =>
                setMode(value === "par_bl" ? "par_bl" : "consolidee")
              }
              aria-labelledby="invoice-mode-label"
              className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {invoiceModes.map((invoiceMode) => (
                <Label
                  key={invoiceMode.value}
                  htmlFor={`invoice-mode-${invoiceMode.value}`}
                  className="cursor-pointer items-start gap-2.5 rounded-lg border p-3 leading-normal transition-colors hover:bg-muted/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:shadow-sm"
                >
                  <RadioGroupItem
                    value={invoiceMode.value}
                    id={`invoice-mode-${invoiceMode.value}`}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {invoiceMode.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {invoiceMode.description}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Total ({selectedBLIds.length} BL{selectedBLIds.length > 1 ? "s" : ""})
              </span>
              <span className="text-lg font-bold tabular-nums">
                {formatCurrency(String(totalTTC))}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedBLIds.length === 0 || createInvoice.isPending}
          >
            {createInvoice.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {mode === "par_bl" ? (
              <span>
                Générer{" "}
                <span className="tabular-nums">{selectedBLIds.length}</span>{" "}
                facture{selectedBLIds.length > 1 ? "s" : ""}
              </span>
            ) : (
              "Générer la facture"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
