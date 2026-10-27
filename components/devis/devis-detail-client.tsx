"use client";

import { useDevisDetail, useDevisMutations } from "@/hooks/use-devis";
import { useDevisDetailStore } from "@/lib/stores/devis-store";
import { formatTND } from "@/lib/decimal";
import { notify } from "@/lib/notify";
import { useRouter } from "next/navigation";
import { PrintOptionsDialog } from "./devis-preview";
import { DevisDetailSkeleton } from "./devis-detail-skeleton";
import { DevisDetailHeader } from "./devis-detail-header";
import { DevisDetailSummary } from "./devis-detail-summary";
import { DevisDetailSidebar } from "./devis-detail-sidebar";
import { computeDevisTotals } from "./devis-detail-totals";

export function DevisDetailClient({ id }: { id: string }) {
    const router = useRouter();
    const { data, isLoading } = useDevisDetail(id);
    const { updateStatus, convertToInvoice, deleteQuote } = useDevisMutations();
    const previewOpen = useDevisDetailStore((s) => s.previewOpen);
    const setPreviewOpen = useDevisDetailStore((s) => s.setPreviewOpen);

    if (isLoading) return <DevisDetailSkeleton />;
    if (!data) return null;

    const { quote } = data;
    const client = quote.tiers as {
        raisonSociale: string;
        matriculeFiscal?: string;
        adresse?: string;
        ville?: string;
        telephone?: string;
        email?: string;
    } | undefined;
    const lines = quote.lines ?? [];
    const devise = quote.devise ?? "TND";
    const tauxChange = quote.tauxChange ? parseFloat(quote.tauxChange) : null;

    const { totalRemise, remisePercent, totalTVA, tauxTVAMoyen, timbreFiscal, totalTTCWithTimbre } = computeDevisTotals(lines, quote, devise);

    const handleSend = () => {
        updateStatus.mutate(
            { id, status: "ENVOYEE" },
            {
                onSuccess: () => notify.success({ title: `Devis ${quote.numero} envoyé` }),
                onError: (err) => notify.error({ title: "Envoi impossible", error: err, context: "envoi du devis" }),
            }
        );
    };

    const handleAccept = () => {
        updateStatus.mutate(
            { id, status: "ACCEPTEE" },
            {
                onSuccess: () => notify.success({ title: `Devis ${quote.numero} accepté` }),
                onError: (err) => notify.error({ title: "Acceptation impossible", error: err, context: "acceptation du devis" }),
            }
        );
    };

    const handleRefuse = () => {
        updateStatus.mutate(
            { id, status: "REFUSEE" },
            {
                onSuccess: () => notify.warning({ title: `Devis ${quote.numero} refusé` }),
                onError: (err) => notify.error({ title: "Refus impossible", error: err, context: "refus du devis" }),
            }
        );
    };

    const handleConvertToInvoice = () => {
        convertToInvoice.mutate(id, {
            onSuccess: (data) => {
                notify.success({
                    title: `Devis ${quote.numero} converti en facture`,
                    action: {
                        label: "Voir facture",
                        onClick: () => router.push(`/factures/${data.invoice.id}`),
                    },
                });
                router.push(`/factures/${data.invoice.id}`);
            },
            onError: (err) => notify.error({ title: "Conversion impossible", error: err, context: "conversion du devis en facture" }),
        });
    };

    const handleDelete = () => {
        deleteQuote.mutate(id, {
            onSuccess: () => {
                notify.success({ title: `Devis ${quote.numero} supprimé`, description: "Suppression définitive." });
                router.push("/devis");
            },
            onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression du devis" }),
        });
    };

    const canSend = quote.status === "BROUILLON";
    const canAccept = quote.status === "ENVOYEE";
    const canRefuse = quote.status === "ENVOYEE";
    const canConvert = quote.status !== "FACTUREE";
    const canDelete = quote.status === "BROUILLON" || quote.status === "REFUSEE" || quote.status === "EXPIREE";

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Page Header — Devis Identity */}
            <DevisDetailHeader
                quote={quote}
                canSend={canSend}
                canAccept={canAccept}
                canRefuse={canRefuse}
                updateStatus={updateStatus}
                handleSend={handleSend}
                handleAccept={handleAccept}
                handleRefuse={handleRefuse}
            />

            <div className="p-4">
                {quote.devise !== "TND" && quote.montantTND && (
                    <div className="rounded-lg bg-secondary border border-border px-4 py-2.5 text-xs text-muted-foreground flex items-center justify-between mb-4 max-w-[1400px] mx-auto">
                        <span>Équivalent TND (taux: {quote.tauxChange ?? "—"})</span>
                        <span className="font-mono font-semibold tabular-nums">
                            {formatTND(quote.montantTND)}
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 max-w-[1400px] mx-auto">
                    {/* LEFT COLUMN */}
                    <DevisDetailSummary
                        quote={quote}
                        lines={lines}
                        client={client}
                        devise={devise}
                        totalRemise={totalRemise}
                        remisePercent={remisePercent}
                        tauxTVAMoyen={tauxTVAMoyen}
                        totalTVA={totalTVA}
                        timbreFiscal={timbreFiscal}
                        totalTTCWithTimbre={totalTTCWithTimbre}
                    />

                    {/* RIGHT COLUMN — Sidebar */}
                    <DevisDetailSidebar
                        quote={quote}
                        devise={devise}
                        tauxChange={tauxChange}
                        totalTTCWithTimbre={totalTTCWithTimbre}
                        canConvert={canConvert}
                        canDelete={canDelete}
                        convertToInvoice={convertToInvoice}
                        handleConvertToInvoice={handleConvertToInvoice}
                        handleDelete={handleDelete}
                    />
                </div>
            </div>

            <PrintOptionsDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} mode="pdf" />
        </div>
    );
}