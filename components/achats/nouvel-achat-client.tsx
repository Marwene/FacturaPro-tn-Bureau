"use client";

import { useAchatFormStore } from "@/lib/stores/achats-store";
import { useFournisseurs } from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/shared/section-card";
import { FormField } from "@/components/shared/form-field";
import { MoneyCell } from "@/components/shared/money-cell";
import { Separator } from "@/components/ui/separator";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import Big from "big.js";
import { AchatFormLines } from "@/components/achats/achat-form-lines";

export function NouvelAchatClient() {
    const form = useAchatFormStore();

    const { data: fournisseursData } = useFournisseurs();
    const fournisseurs = fournisseursData?.fournisseurs ?? [];
    const selectedFournisseur = fournisseurs.find((f) => f.id === form.tiersId) as { id: string; raisonSociale: string; matriculeFiscal?: string | null; ville?: string | null } | undefined;

    const filteredFournisseurs = fournisseurs.filter((f) => {
        const r = f as { raisonSociale: string; matriculeFiscal?: string | null };
        const q = form.tiersSearch.toLowerCase();
        return r.raisonSociale.toLowerCase().includes(q) ||
            (r.matriculeFiscal && r.matriculeFiscal.toLowerCase().includes(q));
    });

    let totalHT = new Big(0);
    let totalTVA = new Big(0);
    for (const line of form.lines) {
        const qty = new Big(parseFloat(line.quantite) || 0);
        const prix = new Big(parseFloat(line.prixAchat) || 0);
        const rem = new Big(parseFloat(line.remise) || 0);
        const ht = qty.times(prix).times(new Big(1).minus(rem.div(100)));
        const tva = ht.times(new Big(parseFloat(line.tauxTVA) || 0).div(100));
        totalHT = totalHT.plus(ht);
        totalTVA = totalTVA.plus(tva);
    }
    const totalTTC = totalHT.plus(totalTVA);

    return (
        <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
                {/* Informations Achat */}
                <SectionCard title="Informations Achat" contentClassName="pt-3 space-y-3">
                        <FormField label="Numéro d'Achat" className="gap-1">
                            <Input
                                value="ACH — auto-généré"
                                disabled
                                className="h-8 text-sm bg-muted text-muted-foreground"
                            />
                        </FormField>
                        <FormField label="Date Facture Fournisseur" className="gap-1">
                            <Input
                                type="date"
                                value={form.dateFacture}
                                onChange={(e) => form.setDateFacture(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </FormField>
                        <FormField label="Date d'Échéance" className="gap-1">
                            <Input
                                type="date"
                                value={form.dateEcheance}
                                onChange={(e) => form.setDateEcheance(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </FormField>
                        <FormField label="Réf. Facture Fournisseur" className="gap-1">
                            <Input
                                value={form.referenceFournisseur}
                                onChange={(e) => form.setReferenceFournisseur(e.target.value)}
                                className="h-8 text-sm"
                                placeholder="N° facture du fournisseur"
                            />
                        </FormField>
                </SectionCard>

                {/* Fournisseur */}
                <SectionCard title="Fournisseur" contentClassName="pt-3">
                        <FormField label="Sélectionner un Fournisseur" className="gap-1">
                            <Combobox
                                value={selectedFournisseur || null}
                                onValueChange={(f) => form.setTiersId(f ? f.id : "")}
                                onInputValueChange={(val) => form.setTiersSearch(val)}
                                itemToStringLabel={(f) => f ? f.raisonSociale : ""}
                            >
                                <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher un fournisseur..." />
                                <ComboboxContent>
                                    <ComboboxEmpty>Aucun fournisseur trouvé.</ComboboxEmpty>
                                    <ComboboxList>
                                        {filteredFournisseurs.map((f) => {
                                            const fr = f as { id: string; raisonSociale: string };
                                            return (
                                                <ComboboxItem key={fr.id} value={fr}>
                                                    {fr.raisonSociale}
                                                </ComboboxItem>
                                            );
                                        })}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </FormField>
                        {selectedFournisseur && (
                            <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-xs space-y-1">
                                <p className="font-semibold">{selectedFournisseur.raisonSociale}</p>
                                {selectedFournisseur.matriculeFiscal && (
                                    <p className="text-muted-foreground font-mono">
                                        MF: {selectedFournisseur.matriculeFiscal}
                                    </p>
                                )}
                                {selectedFournisseur.ville && (
                                    <p className="text-muted-foreground">{selectedFournisseur.ville}</p>
                                )}
                            </div>
                        )}
                </SectionCard>

                <AchatFormLines />

                {/* Notes */}
                <SectionCard title="Notes et Conditions" contentClassName="pt-3">
                        <Textarea
                            placeholder="Notes, conditions de paiement..."
                            value={form.notes}
                            onChange={(e) => form.setNotes(e.target.value)}
                            className="text-sm resize-none h-28"
                        />
                </SectionCard>

                {/* Récapitulatif */}
                <SectionCard title="Récapitulatif" contentClassName="pt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Base HT</span>
                            <span className="text-xs"><MoneyCell value={totalHT.toString()} /></span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Total HT</span>
                            <span className="text-xs"><MoneyCell value={totalHT.toString()} /></span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">TVA</span>
                            <span className="text-xs"><MoneyCell value={totalTVA.toString()} /></span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                            <span className="text-sm font-bold">Total TTC</span>
                            <span className="text-sm font-bold"><MoneyCell value={totalTTC.toString()} /></span>
                        </div>
                </SectionCard>
            </div>
        </div>
    );
}
