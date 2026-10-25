"use client";

import { useAvoirFormStore } from "@/lib/stores/avoirs-store";
import { useAvoirMutations } from "@/hooks/use-avoirs";
import { useClients } from "@/hooks/use-queries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { AvoirFormEntity } from "@/components/avoirs/avoir-form-entity";
import { AvoirFormLines } from "@/components/avoirs/avoir-form-lines";
import Big from "big.js";
import { formatTND, parseTunisianNumber } from "@/lib/decimal";
import { calcLineTotals } from "@/lib/calc-line-totals";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notify";
import { Save, Send } from "lucide-react";

export function NouvelAvoirClient() {
    const router = useRouter();
    const form = useAvoirFormStore();
    const { createAvoir } = useAvoirMutations();
    const { data: clientsData } = useClients();
    const clients = clientsData?.clients ?? [];
    const selectedClient = clients.find((c) => c.id === form.tiersId);

    // Compute recap
    let totalHT = new Big(0);
    let totalTVA = new Big(0);
    let totalFodec = new Big(0);

    for (const line of form.lines) {
        const { ht, fodec, tva } = calcLineTotals(line);
        totalHT = totalHT.plus(ht);
        totalTVA = totalTVA.plus(tva);
        totalFodec = totalFodec.plus(fodec);
    }

    const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);

    const buildPayload = (asDraft: boolean) => ({
        type: form.type,
        tiersId: form.tiersId || null,
        invoiceId: form.invoiceId || null,
        dateEmission: form.dateEmission,
        motif: form.motif || null,
        notes: form.notes || null,
        asDraft,
        lines: form.lines.map((l) => ({
            productId: l.productId || null,
            description: l.description,
            quantite: parseTunisianNumber(l.quantite) || 1,
            prixHT: parseTunisianNumber(l.prixHT) || 0,
            remise: parseTunisianNumber(l.remise) || 0,
            tauxTVA: parseTunisianNumber(l.tauxTVA) || 19,
            fodec: l.fodec,
            tauxFodec: parseTunisianNumber(l.tauxFodec) || 1,
        })),
    });

    const validate = () => {
        if (form.type === "SIMPLE") {
            if (!form.tiersId) { notify.error({ title: "Client requis", error: "Sélectionnez un client pour continuer." }); return false; }
            if (!form.invoiceId) { notify.error({ title: "Facture requise", error: "Sélectionnez la facture concernée par l'avoir." }); return false; }
        }
        if (form.type === "FINANCIER") {
            if (!form.tiersId) { notify.error({ title: "Client ou fournisseur requis", error: "Sélectionnez un tiers pour continuer." }); return false; }
        }
        if (form.lines.length === 0 || form.lines.every((l) => !l.description)) {
            notify.error({ title: "Ligne requise", error: "Ajoutez au moins une ligne à l'avoir." }); return false;
        }
        return true;
    };

    const handleDraft = () => {
        if (!validate()) return;
        createAvoir.mutate(buildPayload(true) as unknown as Record<string, unknown>, {
            onSuccess: (avoir) => { notify.success({ title: `Brouillon ${avoir.numero} sauvegardé` }); form.resetForm(); router.push("/avoirs"); },
            onError: (err) => notify.error({ title: "Brouillon non enregistré", error: err, context: "enregistrement du brouillon d'avoir" }),
        });
    };

    const handleCreateAndSend = () => {
        if (!validate()) return;
        createAvoir.mutate(buildPayload(false) as unknown as Record<string, unknown>, {
            onSuccess: (avoir) => { notify.success({ title: `Avoir ${avoir.numero} émis` }); form.resetForm(); router.push("/avoirs"); },
            onError: (err) => notify.error({ title: "Avoir non émis", error: err, context: "création et émission de l'avoir" }),
        });
    };

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Type d&apos;Avoir</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={form.type} onValueChange={(v) => form.setType(v as "SIMPLE" | "FINANCIER")}>
                                <TabsList className="h-8">
                                    <TabsTrigger value="SIMPLE" className="text-xs">Simple (sur facture)</TabsTrigger>
                                    <TabsTrigger value="FINANCIER" className="text-xs">Financier</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Informations</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">Date d&apos;Émission</Label>
                                <Input type="date" value={form.dateEmission} onChange={(e) => form.setDateEmission(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Label className="text-xs">Motif</Label>
                                <Input value={form.motif} onChange={(e) => form.setMotif(e.target.value)} className="h-8 text-sm" placeholder="Motif de l'avoir..." />
                            </div>
                        </CardContent>
                    </Card>

                    <AvoirFormEntity />

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea value={form.notes} onChange={(e) => form.setNotes(e.target.value)}
                                className="text-sm resize-none h-28" placeholder="Notes complémentaires..." />
                        </CardContent>
                    </Card>
                </div>

                <div className="flex flex-col gap-4">
                    <AvoirFormLines clientExonereTVA={selectedClient?.exonereTVA} />

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">Base HT</span>
                                <span className="text-xs">{formatTND(totalHT.toString())}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">Total HT</span>
                                <span className="text-xs">{formatTND(totalHT.toString())}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">TVA</span>
                                <span className="text-xs">{formatTND(totalTVA.toString())}</span>
                            </div>
                            {totalFodec.gt(0) && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-xs">FODEC</span>
                                    <span className="text-xs">{formatTND(totalFodec.toString())}</span>
                                </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between">
                                <span className="text-sm font-bold">Total TTC</span>
                                <span className="text-sm font-bold">{formatTND(totalTTC.toString())}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className="sticky bottom-0 z-10 mt-4 flex items-center justify-end gap-2 border-t bg-background px-4 py-3">
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => router.push("/avoirs")}>Annuler</Button>
                <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleDraft} disabled={createAvoir.isPending}>
                    <Save className="h-3.5 w-3.5" /> Brouillon
                </Button>
                <Button size="sm" className="text-xs gap-1" onClick={handleCreateAndSend} disabled={createAvoir.isPending}>
                    <Send className="h-3.5 w-3.5" /> {createAvoir.isPending ? "Création..." : "Créer et Émettre"}
                </Button>
            </div>
        </div>
    );
}
