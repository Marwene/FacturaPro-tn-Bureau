"use client";

import { useBLListStore } from "@/lib/stores/bl-store";
import { useBLList, useBLMutations } from "@/hooks/use-bl";
import { StatCard } from "@/components/stat-card";
import { DeliveryNoteStatusBadge, QuoteInvoicedBadge, invoicedBadgeVioletClass } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/decimal";
import { formatDate } from "@/lib/utils";
import { notify } from "@/lib/notify";
import type { SerializedDeliveryNote, DeliveryNoteStatus } from "@/lib/types";
import { MoreHorizontal, FileText, Trash2, CheckCircle, XCircle, ArrowRight, Receipt, FileEdit } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

const columns: ColumnDef<SerializedDeliveryNote>[] = [
    {
        accessorKey: "numero",
        header: "Numéro",
        cell: (info) => <span className="font-medium text-sm">{info.renderValue() as string}</span>,
    },
    {
        accessorFn: (row) =>
            (row.tiers as { raisonSociale: string; ville?: string | null } | undefined)?.raisonSociale ?? "—",
        id: "client",
        header: "Client",
        cell: (info) => {
            const client = (info.row.original as SerializedDeliveryNote).tiers as
                | { raisonSociale: string; ville?: string | null }
                | undefined;
            return (
                <div>
                    <p className="text-sm font-medium">{client?.raisonSociale ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{client?.ville ?? ""}</p>
                </div>
            );
        },
    },
    {
        accessorKey: "dateCreation",
        header: "Date",
        cell: (info) => <span className="text-sm">{formatDate(info.renderValue() as Date)}</span>,
    },
    {
        accessorKey: "dateLivraison",
        header: "Livraison",
        cell: (info) => (
            <span className="text-sm">
                {info.renderValue() ? formatDate(info.renderValue() as Date) : "—"}
            </span>
        ),
    },
    {
        accessorKey: "totalTTC",
        header: "Montant TTC",
        cell: (info) => {
            const bl = info.row.original;
            return <span className="text-sm font-medium">{formatCurrency(bl.totalTTC, bl.devise)}</span>;
        },
    },
    {
        id: "blVise",
        header: "SN",
        cell: (info) => {
            const bl = info.row.original;
            return bl.blViseActif ? (
                // <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">SN Visé</Badge>
                <DeliveryNoteStatusBadge status={"SN_VISE" as DeliveryNoteStatus} />
            ) : null;
        },
    },
    {
        accessorKey: "status",
        header: "Statut",
        cell: (info) => {
            const bl = info.row.original;
            const linkedInvoices = bl.invoices;
            const hasInvoice = linkedInvoices && linkedInvoices.length > 0;
            return (
                <div className="flex flex-col gap-1">
                    <DeliveryNoteStatusBadge status={bl.status} />
                    {hasInvoice && (
                        <QuoteInvoicedBadge
                            className={invoicedBadgeVioletClass}
                            numero={linkedInvoices[0].invoice.numero}
                            date={formatDate(linkedInvoices[0].invoice.dateEmission)}
                        />
                    )}
                </div>
            );
        },
    },
];

export function BLClient() {
    const router = useRouter();
    const { searchInput, setSearchInput, statusFilter, setStatusFilter, deleteTarget, setDeleteTarget, converting, setConverting } = useBLListStore();
    const { data, isFetching, isLoading } = useBLList();
    const { updateStatus, deleteBL, convertToInvoice } = useBLMutations();

    const handleDelete = () => {
        if (!deleteTarget) return;
        const bl = data?.deliveryNotes.find((b) => b.id === deleteTarget);
        deleteBL.mutate(deleteTarget, {
            onSuccess: () => notify.success({ title: `BL ${bl?.numero ?? deleteTarget} supprimé` }),
            onError: (err) => notify.error({ title: "Suppression impossible", error: err, context: "suppression du BL" }),
            onSettled: () => setDeleteTarget(null),
        });
    };

    const handleConvertToInvoice = (bl: SerializedDeliveryNote) => {
        setConverting(bl.id);
        convertToInvoice.mutate(bl, {
            onSuccess: () =>
                notify.success({
                    title: `Facture créée depuis le BL ${bl.numero}`,
                    description: "La facture est disponible dans la liste des factures.",
                    action: {
                        label: "Voir",
                        onClick: () => router.push("/factures"),
                    },
                }),
            onError: (err) => {
                console.error("Conversion BL -> Facture échouée:", err);
                notify.error({ title: "Conversion impossible", error: err, context: "conversion du BL en facture" });
            },
            onSettled: () => setConverting(null),
        });
    };

    const actionsColumn: ColumnDef<SerializedDeliveryNote> = {
        id: "actions",
        cell: (info) => {
            const bl = info.row.original;
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href={`/bons-livraison/${bl.id}`} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Voir détail
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {bl.status === "BROUILLON" && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: bl.id, status: "LIVRE" },
                                        {
                                            onSuccess: () => notify.success({ title: `BL ${bl.numero} livré` }),
                                            onError: (err) => notify.error({ title: "Mise à jour impossible", error: err, context: "marquage du BL comme livré" }),
                                        }
                                    )
                                }
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marquer Livré
                            </DropdownMenuItem>
                        )}
                        {bl.status === "LIVRE" && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: bl.id, status: "BROUILLON" },
                                        {
                                            onSuccess: () => notify.success({ title: `BL ${bl.numero} repassé en brouillon` }),
                                            onError: (err) => notify.error({ title: "Mise à jour impossible", error: err, context: "repassage du BL en brouillon" }),
                                        }
                                    )
                                }
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Repasser en brouillon
                            </DropdownMenuItem>
                        )}
                        {(bl.status === "BROUILLON" || bl.status === "LIVRE") && (
                            <DropdownMenuItem
                                onClick={() =>
                                    updateStatus.mutate(
                                        { id: bl.id, status: "ANNULE" },
                                        {
                                            onSuccess: () => notify.warning({ title: `BL ${bl.numero} annulé` }),
                                            onError: (err) => notify.error({ title: "Annulation impossible", error: err, context: "annulation du BL" }),
                                        }
                                    )
                                }
                                className="text-red-600"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Annuler
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => handleConvertToInvoice(bl)}
                            disabled={converting === bl.id || convertToInvoice.isPending}
                        >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            {converting === bl.id ? "Conversion..." : bl.blViseActif ? "Convertir en Facture (BC Visé)" : "Convertir en Facture"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTarget(bl.id)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            );
        },
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-4 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-80 rounded-lg" />
            </div>
        );
    }

    const { stats } = data ?? {};

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total BL" value={String(stats?.total ?? 0)} icon={FileText} subtitle="Tous les bons de livraison" />
                <StatCard title="Montant Total" value={formatCurrency(stats?.totalTTC ?? "0", "TND")} icon={Receipt} subtitle="Valeur totale des livraisons" />
                <StatCard title="Livrés" value={String(stats?.livres ?? 0)} icon={CheckCircle} subtitle="Livraisons effectuées" subtitleVariant="success" />
                <StatCard title="Brouillons" value={String(stats?.brouillons ?? 0)} icon={FileEdit} subtitle="En cours de rédaction" subtitleVariant="warning" />
            </div>

            <DataTable
                columns={[...columns, actionsColumn]}
                data={(data?.deliveryNotes ?? []) as SerializedDeliveryNote[]}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher (N°, client...)"
                enableColumnVisibility
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
                toolbarActions={
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DeliveryNoteStatus | "ALL")}>
                        <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tous</SelectItem>
                            <SelectItem value="BROUILLON">Brouillon</SelectItem>
                            <SelectItem value="LIVRE">Livré</SelectItem>
                            <SelectItem value="ANNULE">Annulé</SelectItem>
                        </SelectContent>
                    </Select>
                }
            />

            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Supprimer le bon de livraison"
                description={`Êtes-vous sûr de vouloir supprimer le bon de livraison ? Cette action est irréversible.`}
                isLoading={deleteBL.isPending}
            />
        </div>
    );
}