"use client"

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from "@/components/ui/combobox";
import { Building } from "lucide-react";
import type { SerializedCompanyBankAccount } from "@/lib/types";
import type { EffetFormData } from "@/lib/stores/effet-form-store";
import { formatAdresse } from "./effet-form-utils";
import type { NouvelEffetController } from "./use-nouvel-effet";

interface CompteBancaireFieldProps {
    form: EffetFormData;
    set: (updates: Partial<EffetFormData>) => void;
    bankAccounts: SerializedCompanyBankAccount[];
    selectedBankAccount: SerializedCompanyBankAccount | undefined;
}

function CompteBancaireField({ form, set, bankAccounts, selectedBankAccount }: CompteBancaireFieldProps) {
    return (
        <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Notre compte bancaire</Label>
            <Select value={form.companyBankAccountId} onValueChange={(val) => {
                const ba = bankAccounts.find((b) => b.id === val)
                set({ companyBankAccountId: val, tireBanque: ba?.nomBanque ?? form.tireBanque })
            }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>{bankAccounts.map((ba) => (
                    <SelectItem key={ba.id} value={ba.id} className="text-sm">{ba.nomBanque}{ba.rib ? ` — ${ba.rib}` : ""}</SelectItem>
                ))}</SelectContent>
            </Select>
            {bankAccounts.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">Aucun compte bancaire configuré pour cette société. Ajoutez-en dans Paramètres.</p>
            )}
            {selectedBankAccount && (
                <div className="mt-2">
                    <p className="text-[10px] text-muted-foreground">RIB</p>
                    <p className="text-sm font-mono">{selectedBankAccount.rib ?? "—"}</p>
                </div>
            )}
        </div>
    )
}

export function NouvelEffetPartiesPrenantes({ ctrl }: { ctrl: NouvelEffetController }) {
    const {
        isRECU, companyData, form, set, bankAccounts, selectedBankAccount,
        clients, filteredClients, clientSearch, setClientSearch, handleTireurSelect, selectedTireur,
        fournisseurs, filteredFournisseurs, fournisseurSearch, setFournisseurSearch, handleFournisseurSelect, selectedFournisseur,
    } = ctrl

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <div className="border-b bg-gradient-to-r from-blue-500/5 to-transparent px-5 py-3 flex items-center gap-2">
                <Building className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Parties prenantes
                </span>
            </div>
            <div className="p-5">
                {isRECU ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-lg border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Société (Tireur / Bénéficiaire)</span>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Nom</Label>
                                <p className="text-sm">{companyData?.company?.name || "—"}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Adresse</Label>
                                <p className="text-sm">{formatAdresse([companyData?.company?.adresse, companyData?.company?.ville, companyData?.company?.codePostal])}</p>
                            </div>
                            <CompteBancaireField form={form} set={set} bankAccounts={bankAccounts} selectedBankAccount={selectedBankAccount} />
                        </div>
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client (Tiré / Émetteur)</span>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Client (débiteur)</Label>
                                <Combobox value={selectedTireur?.id ?? null} onValueChange={(id) => { const c = clients.find((cl) => cl.id === id); if (c) handleTireurSelect(c) }}>
                                    <ComboboxInput placeholder="Chercher un client..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="h-9 text-sm" />
                                    <ComboboxContent>
                                        <ComboboxEmpty className="text-xs">Aucun client</ComboboxEmpty>
                                        <ComboboxList>{filteredClients.map((c) => (
                                            <ComboboxItem key={c.id} value={c.id} className="text-sm"><p className="font-medium">{c.raisonSociale}</p><p className="text-xs text-muted-foreground">{c.code} · {c.ville ?? "—"}</p></ComboboxItem>
                                        ))}</ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            </div>
                            {selectedTireur && (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-1.5 block">Nom</Label>
                                        <p className="text-sm">{selectedTireur.raisonSociale}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs text-muted-foreground mb-1.5 block">Adresse</Label>
                                        <p className="text-sm">{formatAdresse([selectedTireur.adresse, selectedTireur.ville, selectedTireur.codePostal])}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-1.5 block">Banque</Label>
                                        <p className="text-sm">{selectedTireur.banque ?? "—"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground mb-1.5 block">RIB</Label>
                                        <p className="text-sm font-mono">{selectedTireur.ribBancaire ?? "—"}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fournisseur (Tireur / Bénéficiaire)</span>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Fournisseur (créateur de l&apos;effet)</Label>
                                <Combobox value={selectedFournisseur?.id ?? null} onValueChange={(id) => { const f = fournisseurs.find((fo) => fo.id === id); if (f) handleFournisseurSelect(f) }}>
                                    <ComboboxInput placeholder="Chercher un fournisseur..." value={fournisseurSearch} onChange={(e) => setFournisseurSearch(e.target.value)} className="h-9 text-sm" />
                                    <ComboboxContent>
                                        <ComboboxEmpty className="text-xs">Aucun fournisseur</ComboboxEmpty>
                                        <ComboboxList>{filteredFournisseurs.map((f) => (
                                            <ComboboxItem key={f.id} value={f.id} className="text-sm"><p className="font-medium">{f.raisonSociale}</p><p className="text-xs text-muted-foreground">{f.code} · {f.ville ?? "—"}</p></ComboboxItem>
                                        ))}</ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            </div>
                            {selectedFournisseur && (
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Nom</p>
                                        <p className="text-sm">{selectedFournisseur.raisonSociale}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Adresse</p>
                                        <p className="text-sm">{selectedFournisseur.adresse ?? "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">Banque</p>
                                        <p className="text-sm">{selectedFournisseur.banque ?? "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground">RIB</p>
                                        <p className="text-sm font-mono">{selectedFournisseur.ribBancaire ?? "—"}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="rounded-lg border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Société (Tiré / Émetteur)</span>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Nom</Label>
                                <p className="text-sm">{form.tire || companyData?.company?.name || "—"}</p>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Adresse</Label>
                                <p className="text-sm">{form.tireAdresse || companyData?.company?.adresse || "—"}</p>
                            </div>
                            <CompteBancaireField form={form} set={set} bankAccounts={bankAccounts} selectedBankAccount={selectedBankAccount} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
