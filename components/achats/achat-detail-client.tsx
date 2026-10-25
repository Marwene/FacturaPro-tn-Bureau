"use client";

import { useAchat, useUpdateAchatStatus } from "@/hooks/use-achats-queries";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { SectionCard } from "@/components/shared/section-card";
import { DateCell } from "@/components/shared/date-cell";
import { MoneyCell } from "@/components/shared/money-cell";
import { Badge } from "@/components/ui/badge";
import { AchatStatusBadge } from "@/components/status-badge";
import { ACHAT_CATEGORIE_LABELS } from "@/lib/stores/achats-store";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/decimal";
import { notify } from "@/lib/notify";
import { AchatDetailActions } from "./achat-detail-actions";
import { AchatDetailSidebar } from "./achat-detail-sidebar";
import { AchatDetailSkeleton } from "./achat-detail-skeleton";
import type { AchatType } from "@/lib/types";

export function AchatDetailClient({ id }: { id: string }) {
    const { data, isLoading } = useAchat(id);
    const updateStatus = useUpdateAchatStatus();

    if (isLoading) return <AchatDetailSkeleton />;
    if (!data) return null;

    const { achat } = data;
    const isBL = achat.type === "BL";
    const fournisseur = achat.tiers as {
        raisonSociale: string; matriculeFiscal?: string; adresse?: string; ville?: string; telephone?: string; email?: string;
    } | undefined;
    const lines = achat.lines ?? [];

    const handleValidate = () =>
        updateStatus.mutate(
            { id, status: "VALIDEE" },
            {
                onSuccess: () =>
                    notify.success({
                        title: isBL ? `BL ${achat.numero} validé` : `Achat ${achat.numero} validé`,
                        description: "Le stock a été mis à jour.",
                    }),
                onError: (err) =>
                    notify.error({ title: "Validation impossible", error: err, context: isBL ? "validation du BL" : "validation de l'achat" }),
            }
        );
    const handleCancel = () =>
        updateStatus.mutate(
            { id, status: "ANNULEE" },
            {
                onSuccess: () =>
                    notify.success({
                        title: isBL ? `BL ${achat.numero} annulé` : `Achat ${achat.numero} annulé`,
                        description: "Le stock a été réajusté si l'achat était déjà validé.",
                    }),
                onError: (err) =>
                    notify.error({ title: "Annulation impossible", error: err, context: isBL ? "annulation du BL" : "annulation de l'achat" }),
            }
        );

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AchatDetailActions achat={achat} onValidate={handleValidate} onCancel={handleCancel} isPending={updateStatus.isPending} />

            <KpiGrid columns={3} className="grid-cols-3 sm:grid-cols-3 gap-3">
                <StatCard title="Total HT" value={formatCurrency(achat.totalHT, "TND")} />
                <StatCard title="TVA" value={formatCurrency(achat.totalTVA, "TND")} />
                <StatCard title="Total TTC" value={formatCurrency(achat.totalTTC, "TND")} />
            </KpiGrid>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                    <SectionCard title="Informations" contentClassName="pt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">{isBL ? "Date livraison" : "Date facture"}</span>
                                <DateCell value={achat.dateFacture} className="text-xs font-medium" />
                            </div>
                            {!isBL && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-xs">Date échéance</span>
                                    <DateCell value={achat.dateEcheance} className="text-xs font-medium" />
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">Réf. fournisseur</span>
                                <span className="text-xs font-medium">{achat.referenceFournisseur ?? "—"}</span>
                            </div>
                            {achat.categorieAchat && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-xs">Catégorie</span>
                                    <Badge variant="secondary">{ACHAT_CATEGORIE_LABELS[achat.categorieAchat]}</Badge>
                                </div>
                            )}
                            {!isBL && achat.blAchat && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-xs">BL lié</span>
                                    <span className="flex items-center gap-1.5 text-xs font-medium">
                                        {achat.blAchat.numero}
                                        <AchatStatusBadge status={achat.blAchat.status} />
                                    </span>
                                </div>
                            )}
                            {achat.notes && (
                                <div className="col-span-2">
                                    <span className="text-muted-foreground text-xs">Notes</span>
                                    <p className="text-xs mt-0.5">{achat.notes}</p>
                                </div>
                            )}
                    </SectionCard>

                    <SectionCard title="Lignes d'Achat" contentClassName="p-0 pt-3">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-xs text-muted-foreground py-2 pl-4">Description</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right">Qté</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right">P.U. Achat</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right">Rem.</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right">TVA</TableHead>
                                        <TableHead className="text-xs text-muted-foreground py-2 text-right pr-4">Total HT</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.map((line) => (
                                        <TableRow key={line.id} className="hover:bg-muted/30">
                                            <TableCell className="py-2 pl-4">
                                                <p className="text-xs font-medium">{line.description}</p>
                                                {line.product && <p className="text-xs text-muted-foreground">{(line.product as { code?: string }).code ?? ""}</p>}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">{line.quantite}</TableCell>
                                            <TableCell className="py-2 text-right text-xs">{parseFloat(line.prixAchat).toFixed(3)}</TableCell>
                                            <TableCell className="py-2 text-right text-xs">{parseFloat(line.remise) > 0 ? `${line.remise}%` : "—"}</TableCell>
                                            <TableCell className="py-2 text-right text-xs">{line.tauxTVA}%</TableCell>
                                            <TableCell className="py-2 text-right text-xs font-medium pr-4"><MoneyCell value={line.totalHT} /></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                    </SectionCard>
                </div>

                <AchatDetailSidebar achat={achat} tiersEntity={fournisseur} />
            </div>
        </div>
    );
}
