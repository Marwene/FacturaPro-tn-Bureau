"use client";

import { useDevisDetail, useDevisMutations } from "@/hooks/use-devis";
import { useDevisDetailStore, usePrintOptionsStore } from "@/lib/stores/devis-store";
import { cn } from "@/lib/utils";
import Big from "big.js";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { QuoteStatusBadge } from "@/components/status-badge";
import { formatTND, formatCurrency } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Send,
    XCircle,
    ReceiptText,
    Trash2,
    Building2,
    MapPin,
    Phone,
    Mail,
    Eye,
    BadgeCheck,
    CalendarDays,
    Clock,
    StickyNote,
} from "lucide-react";
import { PrintOptionsDialog } from "./devis-preview";
import { DevisDetailSkeleton } from "./devis-detail-skeleton";

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

    let totalRemise = new Big(0);
    let totalBaseAvantRemise = new Big(0);
    for (const line of lines) {
        const qty = new Big(line.quantite);
        const prix = new Big(line.prixHT);
        const baseLine = qty.times(prix);
        const rem = new Big(line.remise);
        const remiseAmount = baseLine.times(rem.div(100));
        totalBaseAvantRemise = totalBaseAvantRemise.plus(baseLine);
        totalRemise = totalRemise.plus(remiseAmount);
    }

    const lignesAvecRemise = lines.filter(l => new Big(l.remise).gt(0));
    const tousLesTauxUniques = [...new Set(lignesAvecRemise.map(l => l.remise))];
    const remisePercent = totalRemise.gt(0)
        ? tousLesTauxUniques.length === 1
            ? tousLesTauxUniques[0]
            : totalBaseAvantRemise.gt(0)
                ? `~${totalRemise.div(totalBaseAvantRemise).times(100).toFixed(1)}`
                : "0"
        : "0";

    const timbreFiscal = devise === "TND" ? new Big("1.000") : new Big(0);
    const totalTTCWithTimbre = new Big(quote.totalTTC).plus(timbreFiscal);

    let totalTVA = new Big(0);
    let totalHTForTVA = new Big(0);
    for (const line of lines) {
        const qty = new Big(line.quantite);
        const prix = new Big(line.prixHT);
        const rem = new Big(line.remise);
        const remFactor = new Big(1).minus(rem.div(100));
        const ht = qty.times(prix).times(remFactor);
        const tva = ht.times(new Big(line.tauxTVA).div(100));
        totalTVA = totalTVA.plus(tva);
        totalHTForTVA = totalHTForTVA.plus(ht);
    }
    const tauxTVAMoyen = totalHTForTVA.gt(0)
        ? totalTVA.div(totalHTForTVA).times(100).toFixed(1)
        : "0";

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
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-[1400px] mx-auto px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <h1 className="text-2xl font-bold tracking-tight truncate">
                                {quote.numero}
                            </h1>
                            <QuoteStatusBadge status={quote.status} />
                        </div>
                        {/* Quick actions — top level */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 active:scale-[0.96] transition-transform duration-150"
                                onClick={() => { usePrintOptionsStore.getState().reset(); setPreviewOpen(true); }}
                            >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Aperçu</span>
                            </Button>
                            {canSend && (
                                <Button
                                    size="sm"
                                    className="gap-1.5 active:scale-[0.96] transition-transform duration-150"
                                    onClick={handleSend}
                                    disabled={updateStatus.isPending}
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Envoyer</span>
                                </Button>
                            )}
                            {canAccept && (
                                <Button
                                    size="sm"
                                    className="gap-1.5 active:scale-[0.96] transition-transform duration-150"
                                    onClick={handleAccept}
                                    disabled={updateStatus.isPending}
                                >
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Accepter</span>
                                </Button>
                            )}
                            {canRefuse && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-1.5 active:scale-[0.96] transition-transform duration-150"
                                    onClick={handleRefuse}
                                    disabled={updateStatus.isPending}
                                >
                                    <XCircle className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Refuser</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                    <div className="space-y-5">
                        {/* Client Card — Reference Card */}
                        <div className="rounded-lg border border-border bg-card p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-secondary">
                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client</h3>
                            </div>
                            <p className="font-semibold text-sm">{client?.raisonSociale ?? "—"}</p>
                            {client?.matriculeFiscal && (
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                    MF: {client.matriculeFiscal}
                                </p>
                            )}
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {client?.adresse && (
                                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        <span className="text-pretty">{client.adresse}{client.ville ? `, ${client.ville}` : ""}</span>
                                    </div>
                                )}
                                {client?.telephone && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5 shrink-0" />
                                        <span>{client.telephone}</span>
                                    </div>
                                )}
                                {client?.email && (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                        <span>{client.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Lines Table */}
                        <div className="rounded-lg border border-border bg-card overflow-hidden">
                            <div className="px-5 py-3 border-b border-border">
                                <h3 className="text-sm font-semibold">Lignes du Devis</h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent bg-secondary/50 border-b border-border">
                                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 pl-5">Description</TableHead>
                                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right">Qté</TableHead>
                                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right">P.U. HT</TableHead>
                                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right">Rem.</TableHead>
                                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right">TVA</TableHead>
                                        <TableHead className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider py-2.5 text-right pr-5">Total HT</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lines.map((line, idx) => (
                                        <TableRow
                                            key={line.id}
                                            className={cn(
                                                "transition-colors duration-150 border-b border-border/30 last:border-b-0",
                                                idx % 2 === 0 ? "bg-transparent" : "bg-secondary/20",
                                                "hover:bg-secondary/40"
                                            )}
                                        >
                                            <TableCell className="py-3 pl-5">
                                                <p className="text-xs font-medium">{line.description}</p>
                                                {line.product && (
                                                    <p className="text-[11px] text-muted-foreground font-mono">
                                                        {(line.product as { code?: string }).code ?? ""}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-right text-xs tabular-nums">
                                                {line.quantite}
                                            </TableCell>
                                            <TableCell className="py-3 text-right text-xs tabular-nums">
                                                {parseFloat(line.prixHT).toFixed(3)}
                                            </TableCell>
                                            <TableCell className="py-3 text-right text-xs tabular-nums">
                                                {parseFloat(line.remise) > 0 ? (
                                                    <span className="text-muted-foreground">{line.remise}%</span>
                                                ) : (
                                                    <span className="text-muted-foreground/50">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-right text-xs tabular-nums">
                                                {line.tauxTVA}%
                                                {line.fodec && (
                                                    <span className="ml-1 text-muted-foreground">+F</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-3 text-right text-xs font-medium pr-5 tabular-nums">
                                                {formatCurrency(line.totalHT, quote.devise)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Financial Summary — Progression */}
                        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Récapitulatif</span>
                                <span className="text-[11px] text-muted-foreground">{lines.length} ligne{lines.length > 1 ? "s" : ""}</span>
                            </div>
                            <Separator />
                            <div className="space-y-2.5">
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Base HT</span>
                                    <span className="tabular-nums font-medium">{formatCurrency(quote.baseHT, devise)}</span>
                                </div>
                                {totalRemise.gt(0) && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">Remise ({remisePercent}%)</span>
                                        <span className="text-muted-foreground tabular-nums">−{formatCurrency(totalRemise.toFixed(3), devise)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xs font-semibold">
                                    <span>Total HT</span>
                                    <span className="tabular-nums">{formatCurrency(quote.totalHT, devise)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">TVA ({tauxTVAMoyen}%)</span>
                                    <span className="tabular-nums">{formatCurrency(totalTVA, devise)}</span>
                                </div>
                                {parseFloat(quote.totalFodec) > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">FODEC (1%)</span>
                                        <span className="tabular-nums">{formatCurrency(quote.totalFodec, devise)}</span>
                                    </div>
                                )}
                                {timbreFiscal.gt(0) && (
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            Timbre fiscal
                                            <span className="inline-flex items-center justify-center h-4 px-1.5 rounded-full bg-muted text-[10px] font-medium">1 DT</span>
                                        </span>
                                        <span className="tabular-nums">{formatCurrency(timbreFiscal, devise)}</span>
                                    </div>
                                )}
                                <Separator />
                                <div className="flex justify-between items-baseline pt-1">
                                    <span className="text-sm font-bold">Total TTC</span>
                                    <span className="text-lg font-bold tabular-nums">{formatCurrency(totalTTCWithTimbre, devise)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN — Sidebar */}
                    <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
                        {/* Total TTC — Visual Anchor */}
                        <div className="rounded-xl bg-foreground text-background p-6 shadow-lg dark:shadow-none dark:border dark:border-white/10">
                            <p className="text-[11px] font-medium text-background/50 uppercase tracking-widest">Total TTC</p>
                            <p className="text-3xl font-bold tracking-tight tabular-nums mt-1.5">
                                {formatCurrency(totalTTCWithTimbre, devise)}
                            </p>
                            {devise !== "TND" && tauxChange && (
                                <p className="text-xs text-background/40 mt-2 tabular-nums">
                                    ≈ {formatTND(totalTTCWithTimbre.times(tauxChange))}
                                </p>
                            )}
                        </div>

                        {/* Metadata Card — Dates, Notes, Links */}
                        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Informations
                            </div>
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <CalendarDays className="h-3 w-3" />
                                        Créé le
                                    </span>
                                    <span className="font-medium tabular-nums">{formatDate(quote.dateCreation)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        Expire le
                                    </span>
                                    <span className="font-medium tabular-nums">
                                        {quote.dateExpiration ? formatDate(quote.dateExpiration) : "—"}
                                    </span>
                                </div>
                            </div>
                            {quote.notes && (
                                <>
                                    <Separator />
                                    <div>
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                                            <StickyNote className="h-3 w-3" />
                                            Notes
                                        </span>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{quote.notes}</p>
                                    </div>
                                </>
                            )}
                            {quote.invoiceId && (
                                <>
                                    <Separator />
                                    <Link
                                        href={`/factures/${quote.invoiceId}`}
                                        className="text-xs text-primary hover:underline flex items-center gap-1 transition-colors duration-150"
                                    >
                                        Voir la facture liée
                                        <span className="text-[10px]">→</span>
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Secondary Actions */}
                        <div className="space-y-2">
                            {canConvert && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-center gap-2 active:scale-[0.96] transition-transform duration-150"
                                    onClick={handleConvertToInvoice}
                                    disabled={convertToInvoice.isPending}
                                >
                                    <ReceiptText className="h-3.5 w-3.5" />
                                    {convertToInvoice.isPending ? "Conversion..." : "Convertir en Facture"}
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-[0.96] transition-all duration-150"
                                    onClick={handleDelete}
                                    disabled={convertToInvoice.isPending}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Supprimer
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <PrintOptionsDialog quote={quote} open={previewOpen} onOpenChange={setPreviewOpen} mode="pdf" />
        </div>
    );
}