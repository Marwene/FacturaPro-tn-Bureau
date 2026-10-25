"use client";

import { useInvoiceFormStore } from "@/lib/stores/invoices-store";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useClients, useCompany } from "@/hooks/use-queries";
import { useExchangeRate } from "@/hooks/use-invoices";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/shared/section-card";
import { FormField } from "@/components/shared/form-field";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { InvoiceFormBcVise } from "@/components/factures/invoice-form-bc-vise";
import { InvoiceFormLines } from "@/components/factures/invoice-form-lines";
import Big from "big.js";
import { formatCurrency } from "@/lib/decimal";
import { calcLineTotals } from "@/lib/calc-line-totals";

export function NouvelleFactureClient() {
    const form = useInvoiceFormStore();
    const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId);
    const { data: companyData } = useCompany(selectedCompanyId);

    const { data: clientsData } = useClients();
    const clients = clientsData?.clients ?? [];
    const selectedClient = clients.find((c) => c.id === form.tiersId);

    const { data: exchangeRate } = useExchangeRate(form.devise, form.bcViseActif);

    const showBcVise = (() => {
        if (!selectedClient || (selectedClient.devise !== "TND" && selectedClient.deviseSecondaire !== "TND")) return false;
        const companyType = companyData?.company?.type;
        if (companyType === "OFFSHORE") return true;
        if (!companyType) return true;
        return false;
    })();

    if (exchangeRate && form.bcViseActif && form.devise !== "TND" && !form.tauxChange) {
        form.setTauxChange(exchangeRate);
    }

    const filteredClients = clients.filter(c =>
        c.raisonSociale.toLowerCase().includes(form.clientSearch.toLowerCase()) ||
        (c.matriculeFiscal && c.matriculeFiscal.toLowerCase().includes(form.clientSearch.toLowerCase()))
    );

    // Compute recap
    let totalHT = new Big(0);
    let totalTVA = new Big(0);
    let totalFodec = new Big(0);
    let totalRetenue = new Big(0);
    let totalTfisc = new Big(0);

    for (const line of form.lines) {
        const { ht, fodec, tva } = calcLineTotals(line);
        totalHT = totalHT.plus(ht);
        totalTVA = totalTVA.plus(tva);
        totalFodec = totalFodec.plus(fodec);
    }

    if (selectedClient && parseFloat(selectedClient.tauxRetenue) > 0) {
        const tauxRet = new Big(selectedClient.tauxRetenue);
        totalRetenue = totalHT.times(tauxRet.div(100));
    }

    const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);
    const netAPayer = totalTTC.minus(totalRetenue).plus(totalTfisc);

    if (form.bcViseActif && form.tauxChange && totalTTC.gt(0)) {
        const ttc = new Big(netAPayer.toString());
        const rate = new Big(form.tauxChange);
        const computed = ttc.times(rate).toFixed(4);
        if (computed !== form.montantTND) {
            form.setMontantTND(computed);
        }
    }

    return (
        <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
                <SectionCard title="Informations Facture" contentClassName="pt-3 space-y-3">
                    <FormField label="Numéro de Facture" className="gap-1">
                        <Input value="FAC — auto-généré" disabled className="h-8 text-sm bg-muted text-muted-foreground" />
                    </FormField>
                    <FormField label="Date d&apos;Émission" className="gap-1">
                        <Input type="date" value={form.dateEmission} onChange={(e) => form.setDateEmission(e.target.value)} className="h-8 text-sm" />
                    </FormField>
                    <FormField label="Date d&apos;Échéance" className="gap-1">
                        <Input type="date" value={form.dateEcheance} onChange={(e) => form.setDateEcheance(e.target.value)} className="h-8 text-sm" />
                    </FormField>
                </SectionCard>

                <SectionCard title="Client" contentClassName="pt-3">
                        <FormField label="Sélectionner un Client" className="gap-1">
                            <Combobox
                                value={selectedClient || null}
                                onValueChange={(c) => form.setTiersId(c ? c.id : "")}
                                onInputValueChange={(val) => form.setClientSearch(val)}
                                itemToStringLabel={(c) => c ? c.raisonSociale : ""}
                            >
                                <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher un client..." />
                                <ComboboxContent>
                                    <ComboboxEmpty>Aucun client trouvé.</ComboboxEmpty>
                                    <ComboboxList>
                                        {filteredClients.map((c) => (
                                            <ComboboxItem key={c.id} value={c}>
                                                {c.raisonSociale}
                                            </ComboboxItem>
                                        ))}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </FormField>
                        {selectedClient && (
                            <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-xs flex flex-col gap-1">
                                <p className="font-semibold">{selectedClient.raisonSociale}</p>
                                {selectedClient.matriculeFiscal && (
                                    <p className="text-muted-foreground font-mono">MF: {selectedClient.matriculeFiscal}</p>
                                )}
                                {selectedClient.ville && (
                                    <p className="text-muted-foreground">{selectedClient.ville}</p>
                                )}
                                <div className="flex gap-1 pt-0.5">
                                    {selectedClient.assujettTVA && !selectedClient.exonereTVA && (
                                        <Badge variant="outline" className="text-xs py-0">TVA</Badge>
                                    )}
                                    {selectedClient.exonereTVA && (
                                        <Badge variant="outline" className="text-xs py-0">Exonéré TVA</Badge>
                                    )}
                                    {parseFloat(selectedClient.tauxRetenue) > 0 && (
                                        <Badge variant="outline" className="text-xs py-0 text-orange-600">
                                            RS {selectedClient.tauxRetenue}%
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        )}
                </SectionCard>

                {showBcVise && <InvoiceFormBcVise />}

                <InvoiceFormLines clientExonereTVA={selectedClient?.exonereTVA} />

                <SectionCard title="Notes et Conditions" contentClassName="pt-3">
                        <Textarea
                            placeholder="Notes, conditions de paiement, délai de livraison..."
                            value={form.notes}
                            onChange={(e) => form.setNotes(e.target.value)}
                            className="text-sm resize-none h-28"
                        />
                </SectionCard>

                <SectionCard title="Récapitulatif" contentClassName="pt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Base HT</span>
                            <span className="text-xs">{formatCurrency(totalHT.toString(), form.devise)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Total HT</span>
                            <span className="text-xs">{formatCurrency(totalHT.toString(), form.devise)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">TVA</span>
                            <span className="text-xs">{formatCurrency(totalTVA.toString(), form.devise)}</span>
                        </div>
                        {totalFodec.gt(0) && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">FODEC (1%)</span>
                                <span className="text-xs">{formatCurrency(totalFodec.toString(), form.devise)}</span>
                            </div>
                        )}
                        {totalTfisc.gt(0) && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">Timbre Fiscale (1.000)</span>
                                <span className="text-xs">{formatCurrency(totalTfisc.toString(), form.devise)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs font-medium">Total TTC</span>
                            <span className="text-xs font-semibold">{formatCurrency(totalTTC.toString(), form.devise)}</span>
                        </div>
                        {totalRetenue.gt(0) && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">Retenue source (−)</span>
                                <span className="text-xs text-red-500">−{formatCurrency(totalRetenue.toString(), form.devise)}</span>
                            </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                            <span className="text-sm font-bold">Net à Payer</span>
                            <span className="text-sm font-bold">{formatCurrency(netAPayer.toString(), form.devise)}</span>
                        </div>
                </SectionCard>
            </div>
        </div>
    );
}
