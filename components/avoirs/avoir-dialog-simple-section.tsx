"use client";

import type { UseFormReturn } from "react-hook-form";
import type { QuickAvoirInput } from "./avoir-dialog";
import { Label } from "@/components/ui/label";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";

interface AvoirDialogSimpleSectionProps {
    form: UseFormReturn<QuickAvoirInput>;
    clients: { id: string; raisonSociale: string }[];
    invoices: { id: string; numero: string; totalTTC: string }[];
    selectedClient: { id: string; raisonSociale: string } | null;
    selectedInvoice: { id: string; numero: string; totalTTC: string } | null;
    filteredClients: { id: string; raisonSociale: string }[];
    filteredInvoices: { id: string; numero: string; totalTTC: string }[];
    clientSearch: string;
    invoiceSearch: string;
    onClientSearchChange: (v: string) => void;
    onInvoiceSearchChange: (v: string) => void;
    onClientChange: (c: { id: string; raisonSociale: string } | null) => void;
    onInvoiceChange: (inv: { id: string; numero: string; totalTTC: string } | null) => void;
}

export function AvoirDialogSimpleSection({
    form,
    selectedClient,
    selectedInvoice,
    filteredClients,
    filteredInvoices,
    clientSearch,
    invoiceSearch,
    onClientSearchChange,
    onInvoiceSearchChange,
    onClientChange,
    onInvoiceChange,
}: AvoirDialogSimpleSectionProps) {
    return (
        <>
            <div className="space-y-1">
                <Label className="text-xs">Client *</Label>
                <Combobox
                    value={selectedClient}
                    onValueChange={onClientChange}
                    onInputValueChange={onClientSearchChange}
                    itemToStringLabel={(c: { id: string; raisonSociale: string } | null) => c?.raisonSociale ?? ""}
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
                {form.formState.errors.tiersId && (
                    <p className="text-xs text-red-500">{form.formState.errors.tiersId.message as string}</p>
                )}
            </div>

            {selectedClient && (
                <div className="space-y-1">
                    <Label className="text-xs">Facture *</Label>
                    <Combobox
                        value={selectedInvoice}
                        onValueChange={onInvoiceChange}
                        onInputValueChange={onInvoiceSearchChange}
                        itemToStringLabel={(inv: { id: string; numero: string; totalTTC: string } | null) => inv?.numero ?? ""}
                    >
                        <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher une facture..." />
                        <ComboboxContent>
                            <ComboboxEmpty>Aucune facture trouvée.</ComboboxEmpty>
                            <ComboboxList>
                                {filteredInvoices.map((inv) => (
                                    <ComboboxItem key={inv.id} value={inv}>
                                        {inv.numero}
                                    </ComboboxItem>
                                ))}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {form.formState.errors.invoiceId && (
                        <p className="text-xs text-red-500">{form.formState.errors.invoiceId.message as string}</p>
                    )}
                </div>
            )}
        </>
    );
}
