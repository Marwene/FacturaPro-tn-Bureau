"use client";

import type { UseFormReturn } from "react-hook-form";
import type { QuickAvoirInput } from "./avoir-dialog";
import { Label } from "@/components/ui/label";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";

interface AvoirDialogFinancierSectionProps {
    form: UseFormReturn<QuickAvoirInput>;
    entityTab: string;
    clients: { id: string; raisonSociale: string }[];
    fournisseurs: { id: string; raisonSociale: string }[];
    selectedClient: { id: string; raisonSociale: string } | null;
    selectedFournisseur: { id: string; raisonSociale: string } | null;
    filteredClients: { id: string; raisonSociale: string }[];
    filteredFournisseurs: { id: string; raisonSociale: string }[];
    clientSearch: string;
    fournisseurSearch: string;
    onEntityTabChange: (v: string) => void;
    onClientSearchChange: (v: string) => void;
    onFournisseurSearchChange: (v: string) => void;
    onClientChange: (c: { id: string; raisonSociale: string } | null) => void;
    onFournisseurChange: (f: { id: string; raisonSociale: string } | null) => void;
}

export function AvoirDialogFinancierSection({
    form,
    entityTab,
    selectedClient,
    selectedFournisseur,
    filteredClients,
    filteredFournisseurs,
    clientSearch,
    fournisseurSearch,
    onEntityTabChange,
    onClientSearchChange,
    onFournisseurSearchChange,
    onClientChange,
    onFournisseurChange,
}: AvoirDialogFinancierSectionProps) {
    return (
        <>
            <Tabs
                value={entityTab}
                onValueChange={(v) => onEntityTabChange(v)}
            >
                <TabsList className="h-8">
                    <TabsTrigger value="client" className="text-xs">Client</TabsTrigger>
                    <TabsTrigger value="fournisseur" className="text-xs">Fournisseur</TabsTrigger>
                </TabsList>
            </Tabs>

            {entityTab === "client" ? (
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
                </div>
            ) : (
                <div className="space-y-1">
                    <Label className="text-xs">Fournisseur *</Label>
                    <Combobox
                        value={selectedFournisseur}
                        onValueChange={onFournisseurChange}
                        onInputValueChange={onFournisseurSearchChange}
                        itemToStringLabel={(f: { id: string; raisonSociale: string } | null) => f?.raisonSociale ?? ""}
                    >
                        <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher un fournisseur..." />
                        <ComboboxContent>
                            <ComboboxEmpty>Aucun fournisseur trouvé.</ComboboxEmpty>
                            <ComboboxList>
                                {filteredFournisseurs.map((f) => (
                                    <ComboboxItem key={f.id} value={f}>
                                        {f.raisonSociale}
                                    </ComboboxItem>
                                ))}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>
            )}

            {form.formState.errors.tiersId && (
                <p className="text-xs text-red-500">{form.formState.errors.tiersId.message as string}</p>
            )}
        </>
    );
}
