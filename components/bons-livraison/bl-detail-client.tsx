"use client";

import { useBLDetail, useBLMutations } from "@/hooks/use-bl";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useSettings, useCompany } from "@/hooks/use-queries";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import { exportDocumentPDF, buildDocumentHTML, deliveryNoteToDocumentOptions } from "@/lib/export-utils";
import { BLDetailSkeleton } from "@/components/bons-livraison/bl-detail-skeleton";
import { BLDetailActions } from "@/components/bons-livraison/bl-detail-actions";
import { BLDetailSidebar } from "@/components/bons-livraison/bl-detail-sidebar";
import { notify } from "@/lib/notify";
import { useRouter } from "next/navigation";

export function BLDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const { data, isLoading } = useBLDetail(id);
    const { updateStatus, deleteBL } = useBLMutations();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.settings;
    const selectedCompanyId = useCompanyStore((s) => s.selectedCompanyId);
    const { data: companyData } = useCompany(selectedCompanyId);
    const company = companyData?.company;

    if (isLoading) return <BLDetailSkeleton />;
    if (!data) return null;

    const { deliveryNote: bl } = data;
    const client = bl.tiers as {
        raisonSociale: string;
        matriculeFiscal?: string;
        adresse?: string;
        ville?: string;
        telephone?: string;
        email?: string;
    } | undefined;
    const lines = bl.lines ?? [];

    const handleMarkDelivered = () => {
        updateStatus.mutate(
            { id, status: "LIVRE" },
            {
                onSuccess: () => notify.success({ title: `BL ${bl.numero} livré` }),
                onError: (err) => notify.error({ title: "Mise à jour impossible", error: err, context: "marquage du BL comme livré" }),
            }
        );
    };

    const handleCancel = () => {
        updateStatus.mutate(
            { id, status: "ANNULE" },
            {
                onSuccess: () => notify.warning({ title: `BL ${bl.numero} annulé` }),
                onError: (err) => notify.error({ title: "Annulation impossible", error: err, context: "annulation du BL" }),
            }
        );
    };

    const handleDelete = () => {
        deleteBL.mutate(id, {
            onSuccess: () => {
                notify.success({ title: `BL ${bl.numero} supprimé`, description: "Suppression définitive." });
                router.push("/bons-livraison");
            },
            onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression du BL" }),
        });
    };

    const companyOverride = company
        ? {
              name: company.name,
              tagline: company.type === "OFFSHORE" ? "Société Offshore" : "Société Locale",
              address: [company.adresse, company.ville, company.codePostal].filter(Boolean).join(", "),
              phone: company.telephone ?? undefined,
              email: company.email ?? undefined,
              mf: company.matriculeFiscal ?? undefined,
          }
        : undefined;

    const handlePrint = () => {
        const opts = deliveryNoteToDocumentOptions(bl, settings, undefined, companyOverride);
        const html = buildDocumentHTML(opts, { autoPrint: true });
        const w = window.open("", "_blank", "width=900,height=1100");
        if (!w) return;
        w.document.write(html);
        w.document.close();
    };

    const handlePDF = () => {
        const opts = deliveryNoteToDocumentOptions(bl, settings, undefined, companyOverride);
        exportDocumentPDF(opts);
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <BLDetailActions
                bl={bl}
                onPrint={handlePrint}
                onPDF={handlePDF}
                onMarkDelivered={handleMarkDelivered}
                onCancel={handleCancel}
                onDelete={handleDelete}
                isUpdating={updateStatus.isPending}
                isDeleting={deleteBL.isPending}
            />

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
                <StatCard title="Total HT" value={formatCurrency(bl.totalHT, bl.devise)} />
                <StatCard title="TVA" value={formatCurrency(bl.totalTVA, bl.devise)} />
                <StatCard title="Total TTC" value={formatCurrency(bl.totalTTC, bl.devise)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
                {/* Left: BL info + lines */}
                <div className="col-span-2 space-y-4">
                    {/* BL info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">
                                Informations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">Date de création</span>
                                <span className="text-xs font-medium">{formatDate(bl.dateCreation)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground text-xs">Date de livraison</span>
                                <span className="text-xs font-medium">
                                    {bl.dateLivraison ? formatDate(bl.dateLivraison) : "—"}
                                </span>
                            </div>
                            {bl.notes && (
                                <div className="col-span-2">
                                    <span className="text-muted-foreground text-xs">Notes</span>
                                    <p className="text-xs mt-0.5">{bl.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Lines */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold">
                                Lignes du Bon de Livraison
                            </CardTitle>
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
                                    {lines.map((line) => (
                                        <TableRow key={line.id} className="hover:bg-muted/30">
                                            <TableCell className="py-2 pl-4">
                                                <p className="text-xs font-medium">{line.description}</p>
                                                {line.product && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {(line.product as { code?: string }).code ?? ""}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                {line.quantite}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                {formatCurrency(line.prixHT, bl.devise)}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                {parseFloat(line.remise) > 0 ? `${line.remise}%` : "—"}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs">
                                                {line.tauxTVA}%
                                                {line.fodec && (
                                                    <span className="ml-1 text-muted-foreground">+F</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2 text-right text-xs font-medium pr-4">
                                                {formatCurrency(line.totalHT, bl.devise)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <BLDetailSidebar bl={bl} client={client} />
            </div>
        </div>
    );
}