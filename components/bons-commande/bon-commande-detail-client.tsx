"use client";

import { useParams, useRouter } from "next/navigation";
import { useBCDetail, useBCMutations } from "@/hooks/use-bc";
import { useBCDetailStore } from "@/lib/stores/bons-commande-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { notify } from "@/lib/notify";
import { ValidationDialog } from "./validation-dialog";
import { RapprochementCard } from "./rapprochement-card";
import { ProductionCard } from "./production-card";
import { BCDetailSidebar } from "./bc-detail-sidebar";
import { formatCurrency } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import {
    ArrowLeft,
    Wallet,
    Receipt,
    BadgePercent,
    CheckCircle2,
    XCircle,
    Trash2,
    Loader2,
} from "lucide-react";
import type { SerializedBonCommande, SerializedBonCommandeLine } from "@/lib/types";

export function BonCommandeDetailClient() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data, isLoading } = useBCDetail(id);
    const { updateStatus, deleteBC } = useBCMutations();
    const { setShowValidation } = useBCDetailStore();

    const bc = data?.data ?? (null as SerializedBonCommande | null);

    if (isLoading) {
        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <Skeleton className="h-9 w-64" />
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20" />
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="col-span-2 h-80" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        );
    }

    if (!bc) {
        return (
            <div className="flex-1 overflow-y-auto p-4">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Bon de commande introuvable</p>
                    <Button variant="link" onClick={() => router.push("/bons-commande")}>
                        Retour à la liste
                    </Button>
                </div>
            </div>
        );
    }

    const handleDelete = () => {
        deleteBC.mutate(id, {
            onSuccess: () => {
                notify.success({ title: `Bon de commande ${bc.numero} supprimé` });
                router.push("/bons-commande");
            },
            onError: (err: unknown) =>
                notify.error({
                    title: "Suppression du bon de commande impossible",
                    error: err,
                    context: "lors de la suppression du bon de commande",
                }),
        });
    };

    const handleValidate = () => setShowValidation(true);

    const handleCancel = () => {
        updateStatus.mutate(
            { id, status: "ANNULE" },
            {
                onSuccess: () =>
                    notify.success({ title: `Bon de commande ${bc.numero} annulé` }),
                onError: (err: unknown) =>
                    notify.error({
                        title: "Annulation du bon de commande impossible",
                        error: err,
                        context: "lors de l'annulation du bon de commande",
                    }),
            }
        );
    };

    const lines = bc.lines ?? [];

    const hasStock = lines.some((l) => l.typeSource === "STOCK");
    const hasProduction = lines.some((l) => l.typeSource === "PRODUCTION");
    const isMixed = hasStock && hasProduction;

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Actions header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/bons-commande")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold tracking-tight">{bc.numero}</h1>
                            <StatusBadge type="bon-commande" status={bc.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {bc.tiers?.raisonSociale ?? "—"} · Créé le {formatDate(bc.dateCreation)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {bc.status === "BROUILLON" && (
                        <Button size="sm" onClick={handleValidate} disabled={updateStatus.isPending}>
                            {updateStatus.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Valider
                        </Button>
                    )}
                    {bc.status === "BROUILLON" && (
                        <Button size="sm" variant="outline" onClick={handleCancel} disabled={updateStatus.isPending}>
                            <XCircle className="h-4 w-4 mr-2" />
                            Annuler
                        </Button>
                    )}
                    <Button size="icon" variant="destructive" className="h-8 w-8" onClick={handleDelete} disabled={deleteBC.isPending}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard title="Total HT" value={formatCurrency(bc.totalHT)} icon={Wallet} />
                <StatCard title="TVA" value={formatCurrency(bc.totalTVA)} icon={BadgePercent} />
                <StatCard title="Total TTC" value={formatCurrency(bc.totalTTC)} icon={Receipt} />
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Left: lines + rapprochement + notes */}
                <div className="col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">Articles</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs text-muted-foreground py-2 pl-4">Description</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right">Qté</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right">P.U. HT</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right">Rem.</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right">TVA</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right pr-4">Total HT</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.map((l: SerializedBonCommandeLine) => (
                                        <TableRow key={l.id} className="hover:bg-muted/30">
                                            <TableCell className="py-2 pl-4">
                                                <p className="text-xs font-medium">{l.description}</p>
                                                {l.product?.code && (
                                                    <p className="text-xs text-muted-foreground">{l.product.code}</p>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                {Number(l.quantite).toFixed(3)}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                {formatCurrency(l.prixHT)}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                {Number(l.remise) > 0 ? `${l.remise}%` : "—"}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                {l.tauxTVA}%
                                                {l.fodec && <span className="ml-1 text-muted-foreground">+F</span>}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs font-medium pr-4">
                                                {formatCurrency(l.totalHT)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {lines.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                                                Aucun article
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Rapprochement quantités BC / BC détaillé — only when BC has production lines */}
                    {hasProduction && <RapprochementCard bonCommandeId={bc.id} isMixed={isMixed} />}

                    {/* Lancement des OF de production, article par article */}
                    <ProductionCard bonCommandeId={bc.id} tiersId={bc.tiersId} />

                    {bc.notes && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-semibold">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs whitespace-pre-wrap">{bc.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <BCDetailSidebar bc={bc} client={bc.tiers} />
            </div>

            <ValidationDialog bonCommandeId={bc.id} tiersId={bc.tiersId} companyId={bc.companyId} />
        </div>
    );
}
