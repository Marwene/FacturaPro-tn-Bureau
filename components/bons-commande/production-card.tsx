"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notify } from "@/lib/notify";
import { Factory, Loader2, ExternalLink, Lock } from "lucide-react";
import { useBCRapprochement, useBCRapprochementMutations } from "@/hooks/use-bc-rapprochement";
import type { SerializedBonCommandeLine } from "@/lib/types";

function ProductionRow({
    ligne,
    tiersId,
    bonCommandeId,
}: {
    ligne: SerializedBonCommandeLine;
    tiersId: string;
    bonCommandeId: string;
}) {
    const { launchOF } = useBCRapprochementMutations(bonCommandeId);
    const ordres = ligne.ordresFabrication ?? [];
    const dejaLance = ordres.length > 0;
    const bloque = ligne.statutRapprochement !== "RECONCILIE";
    const sansProduit = !ligne.productId;

    const handleLaunch = async () => {
        if (!ligne.productId) return;
        try {
            await launchOF.mutateAsync({
                productId: ligne.productId,
                tiersId,
                bonCommandeLineId: ligne.id,
                quantite: Math.round(Number(ligne.quantite)),
            });
            notify.success({
                title: "Ordre de fabrication lancé",
                description: `OF créé pour « ${ligne.description} » — suivi dans l'atelier.`,
            });
        } catch (e) {
            notify.error({
                title: "Lancement de l'ordre de fabrication impossible",
                error: e,
                context: "lors du lancement de l'ordre de fabrication",
            });
        }
    };

    return (
        <TableRow>
            <TableCell>
                <div className="font-medium text-xs">{ligne.description}</div>
                {sansProduit && (
                    <div className="text-xs text-amber-600">Aucun produit associé — OF impossible</div>
                )}
            </TableCell>
            <TableCell className="text-right text-xs">{Number(ligne.quantite).toFixed(3)}</TableCell>
            <TableCell>
                {ordres.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Aucun OF</span>
                ) : (
                    <div className="flex flex-col gap-1">
                        {ordres.map((of) => (
                            <Link
                                key={of.id}
                                href="/atelier/production"
                                className="inline-flex items-center gap-1 text-xs hover:underline"
                            >
                                {of.code} <StatusBadge type="ordre-fabrication" status={of.statut} />
                                <ExternalLink className="h-3 w-3" />
                            </Link>
                        ))}
                    </div>
                )}
            </TableCell>
            <TableCell className="text-right">
                <Button
                    size="sm"
                    variant={dejaLance ? "outline" : "default"}
                    onClick={handleLaunch}
                    disabled={bloque || sansProduit || launchOF.isPending}
                >
                    {launchOF.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    ) : bloque ? (
                        <Lock className="h-3.5 w-3.5 mr-2" />
                    ) : (
                        <Factory className="h-3.5 w-3.5 mr-2" />
                    )}
                    {dejaLance ? "Lancer un autre OF" : "Lancer l'OF"}
                </Button>
            </TableCell>
        </TableRow>
    );
}

export function ProductionCard({ bonCommandeId, tiersId }: { bonCommandeId: string; tiersId: string }) {
    const { data, isLoading } = useBCRapprochement(bonCommandeId);
    const lignesProduction = (data?.lignes ?? []).filter((l) => l.typeSource === "PRODUCTION");

    if (isLoading || lignesProduction.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lancement en production</CardTitle>
                <CardDescription>
                    Un ordre de fabrication par article, lançable individuellement une fois le rapprochement soldé.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="pl-4">Article</TableHead>
                            <TableHead className="text-right">Qté</TableHead>
                            <TableHead>OF lancés</TableHead>
                            <TableHead className="text-right pr-4">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {lignesProduction.map((l) => (
                            <ProductionRow key={l.id} ligne={l} tiersId={tiersId} bonCommandeId={bonCommandeId} />
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
