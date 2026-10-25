"use client";

import { useDevisFormStore } from "@/lib/stores/devis-store";
import { useClients, useProducts } from "@/hooks/use-queries";
import {
    useDevisTauxBCT,
    useDevisDateExpirationInit,
    useDevisTauxChangeSync,
    useDevisMontantTndSync,
} from "@/hooks/use-devis";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LineItemsTable } from "@/components/shared/line-items-table";
import { formatCurrency } from "@/lib/decimal";
import { calcLineTotals } from "@/lib/calc-line-totals";
import Big from "big.js";

export function NouveauDevisClient() {
    const form = useDevisFormStore();

    // Auto-remplir la date d'expiration (10 jours après la création) —
    // hooks/use-devis.ts (ex-useEffect, requêtes init/sync déplacées telles
    // quelles : mêmes clés, mêmes déclencheurs, mêmes gardes).
    useDevisDateExpirationInit(form.dateCreation);

    const { data: clientsData } = useClients();
    const { data: productsData } = useProducts();
    const clients = clientsData?.clients ?? [];
    const products = productsData?.products ?? [];

    // Hook taux BCT (SANS useEffect - retourne juste la valeur)
    const tauxBCTQuery = useDevisTauxBCT(form.devise, form.devise !== "TND");
    const tauxChange = tauxBCTQuery.data ?? form.tauxChange;

    // Sync le taux BCT dans le store pour que buildPayload() l'inclue
    // (hooks/use-devis.ts — ex-useEffect [tauxBCTQuery.data]).
    useDevisTauxChangeSync(form.devise, tauxBCTQuery.data);

    // Sélection client avec auto-devise
    const handleClientChange = (clientId: string) => {
        const client = clients.find(c => c.id === clientId);
        form.setTiersId(clientId);
        if (client?.devise) {
            form.setDevise(client.devise);
        }
        const isExonere = client?.exonereTVA ?? false;
        form.setExonereTVA(isExonere);
        if (isExonere) {
            form.lines.forEach(line => form.updateLine(line.id, { tauxTVA: "0", fodec: false }));
        } else {
            // Restaurer la TVA par défaut (19%) et le FODEC du produit pour chaque ligne existante
            form.lines.forEach(line => {
                const product = products.find(p => p.id === line.productId);
                form.updateLine(line.id, {
                    tauxTVA: product?.tauxTVA ?? "19",
                    fodec: product?.fodec ?? false,
                });
            });
        }
    };

    let totalHT = new Big(0);
    let totalTVA = new Big(0);
    let totalFodec = new Big(0);

    const selectedClient = clients.find((c) => c.id === form.tiersId);
    const clientExonereTVA = selectedClient?.exonereTVA ?? false;

    for (const line of form.lines) {
        const { ht, fodec, tva } = calcLineTotals(line, clientExonereTVA);
        totalHT = totalHT.plus(ht);
        totalTVA = totalTVA.plus(tva);
        totalFodec = totalFodec.plus(fodec);
    }

    const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);

    // Calculer et stocker montantTND quand le taux change — lu uniquement par
    // buildPayload() (le JSX affiche « Équivalent TND » calculé en direct) —
    // hooks/use-devis.ts (ex-useEffect [tauxChange, form.devise, totalTTC]).
    useDevisMontantTndSync(tauxChange, form.devise, totalTTC);

    let totalRemise = new Big(0);
    let totalBaseAvantRemise = new Big(0);
    for (const line of form.lines) {
        const qty = new Big(line.quantite || "0");
        const prix = new Big(line.prixHT || "0");
        const baseLine = qty.times(prix);
        const rem = new Big(line.remise || "0");
        const remiseAmount = baseLine.times(rem.div(100));
        totalBaseAvantRemise = totalBaseAvantRemise.plus(baseLine);
        totalRemise = totalRemise.plus(remiseAmount);
    }
    const lignesAvecRemise = form.lines.filter(l => new Big(l.remise || "0").gt(0));
    const tousLesTauxUniques = [...new Set(lignesAvecRemise.map(l => l.remise))];
    const remisePercent = totalRemise.gt(0)
        ? tousLesTauxUniques.length === 1
            ? tousLesTauxUniques[0]
            : totalBaseAvantRemise.gt(0)
                ? `~${totalRemise.div(totalBaseAvantRemise).times(100).toFixed(1)}`
                : "0"
        : "0";

    const timbreFiscal = form.devise === "TND" ? new Big("1.000") : new Big(0);

    return (
        <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
                {/* Informations Devis */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">
                            Informations Devis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Numéro de Devis</Label>
                            <Input
                                value="DEV — auto-généré"
                                disabled
                                className="h-8 text-sm bg-muted text-muted-foreground"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Date de création</Label>
                            <Input
                                type="date"
                                value={form.dateCreation}
                                onChange={(e) => form.setDateCreation(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Date d&apos;expiration</Label>
                            <Input
                                type="date"
                                value={form.dateExpiration}
                                onChange={(e) => form.setDateExpiration(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Client */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">Client</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            <Label className="text-xs">Sélectionner un Client</Label>
                            <Select value={form.tiersId} onValueChange={handleClientChange}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Choisir un client..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.raisonSociale}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedClient && (
                            <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-xs space-y-1">
                                <p className="font-semibold">{selectedClient.raisonSociale}</p>
                                {selectedClient.matriculeFiscal && (
                                    <p className="text-muted-foreground font-mono">
                                        MF: {selectedClient.matriculeFiscal}
                                    </p>
                                )}
                                {selectedClient.ville && (
                                    <p className="text-muted-foreground">{selectedClient.ville}</p>
                                )}
                                <div className="flex gap-1 pt-0.5 flex-wrap">
                                    {selectedClient.assujettTVA && !selectedClient.exonereTVA && (
                                        <Badge variant="outline" className="text-xs py-0">TVA</Badge>
                                    )}
                                    {selectedClient.exonereTVA && (
                                        <Badge variant="outline" className="text-xs py-0">Exonéré TVA</Badge>
                                    )}
                                    {form.devise !== "TND" && (
                                        <Badge variant="secondary" className="text-xs py-0">{form.devise}</Badge>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sélecteur de devise */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Devise</Label>
                        <Select value={form.devise} onValueChange={(v) => form.setDevise(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TND">TND - Dinar Tunisien</SelectItem>
                                <SelectItem value="EUR">EUR - Euro</SelectItem>
                                <SelectItem value="USD">USD - Dollar US</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {form.devise !== "TND" && (
                        <div className="space-y-2">
                            <Label>Taux de change (BCT)</Label>
                            <Input
                                type="number"
                                step="0.0001"
                                value={tauxChange ?? form.tauxChange ?? ""}
                                onChange={(e) => form.setTauxChange(e.target.value)}
                                placeholder="Ex: 3.2500"
                            />
                            {tauxBCTQuery.data && (
                                <p className="text-xs text-muted-foreground">
                                    Taux BCT: {tauxBCTQuery.data}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Lignes */}
                <div className="col-span-2">
                    <Card>
                        <CardContent className="pt-6">
                            <LineItemsTable
                                lines={form.lines}
                                products={products}
                                currency={form.devise}
                                exonereTVA={clientExonereTVA}
                                title="Lignes du Devis"
                                onAddLine={form.addLine}
                                onRemoveLine={form.removeLine}
                                onUpdateLine={(id, updates) => form.updateLine(id, updates)}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Notes */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">
                            Notes et Conditions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Notes, conditions de paiement, délai de livraison..."
                            value={form.notes}
                            onChange={(e) => form.setNotes(e.target.value)}
                            className="text-sm resize-none h-28"
                        />
                    </CardContent>
                </Card>

                {/* Récapitulatif */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">
                            Récapitulatif
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Base HT</span>
                            <span className="text-xs">{formatCurrency(totalHT, form.devise)}</span>
                        </div>
                        {totalRemise.gt(0) && (
                            <div className="flex justify-between text-orange-600">
                                <span className="text-xs">Remise ({remisePercent}%)</span>
                                <span className="text-xs">-{formatCurrency(totalRemise, form.devise)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">Total HT</span>
                            <span className="text-xs font-medium">{formatCurrency(totalHT, form.devise)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-xs">TVA</span>
                            <span className="text-xs">{formatCurrency(totalTVA, form.devise)}</span>
                        </div>
                        {totalFodec.gt(0) && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">FODEC (1%)</span>
                                <span className="text-xs">{formatCurrency(totalFodec, form.devise)}</span>
                            </div>
                        )}
                        {timbreFiscal.gt(0) && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">Timbre fiscal</span>
                                <span className="text-xs">{formatCurrency(timbreFiscal, form.devise)}</span>
                            </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                            <span className="text-sm font-bold">Total TTC</span>
                            <span className="text-sm font-bold">{formatCurrency(totalTTC.plus(timbreFiscal), form.devise)}</span>
                        </div>
                        {form.devise !== "TND" && tauxChange && (
                            <div className="mt-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950 text-xs space-y-1">
                                <div className="flex justify-between text-blue-700 dark:text-blue-300">
                                    <span>Taux BCT</span>
                                    <span className="font-mono">{tauxChange}</span>
                                </div>
                                <div className="flex justify-between text-blue-700 dark:text-blue-300">
                                    <span>Équivalent TND</span>
                                    <span className="font-mono font-bold">
                                        {formatCurrency(totalTTC.plus(timbreFiscal).times(new Big(tauxChange)), "TND")}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
