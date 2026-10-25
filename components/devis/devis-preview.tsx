"use client";

import { useSettings, useCompany } from "@/hooks/use-queries";
import { useCompanyStore } from "@/lib/stores/company-store";
import { usePrintOptionsStore } from "@/lib/stores/devis-store";
import type { SerializedQuote } from "@/lib/types";
import { buildDocumentHTML, quoteToDocumentOptions } from "@/lib/export-utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Printer, Download, Eye } from "lucide-react";

export type PrintOptions = {
    includeTaxBreakdown: boolean;
    includeNotes: boolean;
    useBrandedPrint: boolean;
};

interface PrintOptionsDialogProps {
    quote: SerializedQuote;
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title?: string;
    description?: string;
    mode?: "pdf" | "print";
}

const buildCompanyOverride = (company: {
    name: string;
    type: string;
    adresse?: string | null;
    ville?: string | null;
    codePostal?: string | null;
    telephone?: string | null;
    email?: string | null;
    matriculeFiscal?: string | null;
} | undefined) =>
    company
        ? {
              name: company.name,
              tagline: company.type === "OFFSHORE" ? "Société Offshore" : "Société Locale",
              address: [company.adresse, company.ville, company.codePostal].filter(Boolean).join(", "),
              phone: company.telephone ?? undefined,
              email: company.email ?? undefined,
              mf: company.matriculeFiscal ?? undefined,
          }
        : undefined;

export function PrintOptionsDialog({
    quote,
    open,
    onOpenChange,
    title = "Options d'export",
    description = "Choisissez les sections à inclure et prévisualisez avant de générer.",
    mode = "pdf",
}: PrintOptionsDialogProps) {
    const { data: settingsData } = useSettings();
    const settings = settingsData?.settings;
    const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId);
    const { data: companyData } = useCompany(selectedCompanyId);
    const company = companyData?.company;

    const includeTaxBreakdown = usePrintOptionsStore((s) => s.includeTaxBreakdown);
    const includeNotes = usePrintOptionsStore((s) => s.includeNotes);
    const useBrandedPrint = usePrintOptionsStore((s) => s.useBrandedPrint);
    const setTax = usePrintOptionsStore((s) => s.setTax);
    const setNotes = usePrintOptionsStore((s) => s.setNotes);
    const setBranded = usePrintOptionsStore((s) => s.setBranded);

    const companyOverride = buildCompanyOverride(company);
    const docOpts = quoteToDocumentOptions(quote, settings, {
        includeTaxBreakdown,
        includeNotes,
    }, companyOverride);
    const previewHTML = buildDocumentHTML(docOpts);

    const confirm = () => {
        const html = buildDocumentHTML(docOpts, { autoPrint: true });
        const win = window.open("", "_blank", "width=900,height=1100");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        onOpenChange(false);
    };

    const showBrandedToggle = mode === "print";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2.5 cursor-pointer hover:bg-secondary/50">
                            <Checkbox checked={includeTaxBreakdown} onCheckedChange={(v) => setTax(!!v)} />
                            <div className="flex-1">
                                <div className="text-sm font-medium">Détail des taxes</div>
                                <div className="text-xs text-muted-foreground">Sous-total HT, FODEC, TVA</div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2.5 cursor-pointer hover:bg-secondary/50 focus-within:ring-2 focus-within:ring-ring/50">
                            <Checkbox checked={includeNotes} onCheckedChange={(v) => setNotes(!!v)} />
                            <div className="flex-1">
                                <div className="text-sm font-medium">Notes / pied de page</div>
                                <div className="text-xs text-muted-foreground">Conditions et mentions légales</div>
                            </div>
                        </label>

                        {showBrandedToggle && (
                        <label className="flex items-center gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2.5 cursor-pointer hover:bg-secondary/50 focus-within:ring-2 focus-within:ring-ring/50">
                                <Checkbox checked={useBrandedPrint} onCheckedChange={(v) => setBranded(!!v)} />
                                <div className="flex-1">
                                    <div className="text-sm font-medium">Mise en page PDF brandée</div>
                                    <div className="text-xs text-muted-foreground">
                                        Imprime via le générateur PDF (résultat identique au PDF). Désactivez pour l&apos;impression navigateur.
                                    </div>
                                </div>
                            </label>
                        )}

                        <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground flex items-start gap-2">
                            <Eye className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>L&apos;aperçu ci-contre se met à jour automatiquement selon les options.</span>
                        </div>
                    </div>

                    <div className="rounded-md border border-border bg-muted/20 overflow-hidden">
                        {previewHTML ? (
                            <iframe
                                title="Aperçu document"
                                srcDoc={previewHTML}
                                className="w-full h-[520px] bg-white"
                            />
                        ) : (
                            <div className="h-[520px] flex items-center justify-center text-xs text-muted-foreground">
                                Aucun aperçu disponible
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
                    <Button onClick={confirm} className="gap-2">
                        {mode === "print" ? <Printer className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                        {mode === "print" ? "Imprimer" : "Générer le PDF"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
