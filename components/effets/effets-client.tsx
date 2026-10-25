"use client";

import { useEffetsList, useEffetsMutations } from "@/hooks/use-effets";
import { useEffetsEcheances } from "@/hooks/use-effets-echeances";
import { useEffetsStore } from "@/lib/stores/effets-store";
import { StatCard } from "@/components/stat-card";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { DateCell } from "@/components/shared/date-cell";
import { MoneyCell } from "@/components/shared/money-cell";
import { EffetStatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatTND } from "@/lib/decimal";
import { MoreHorizontal, Eye, Trash2, Landmark, ArrowLeftRight, Ban, CheckCircle2, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Bell, X, Printer } from "lucide-react";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyDocs } from "@/components/ui/illustrations";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedEffet, EffetStatus, EffetType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import Link from "next/link";

const statusFilterOptions = [
    { label: "En portefeuille", value: "EN_PORTEFEUILLE" },
    { label: "Remis à l'escompte", value: "REMIS_ESCOMPTE" },
    { label: "Endossé", value: "ENDOSSE" },
    { label: "Impayé", value: "IMPAYE" },
    { label: "Payé", value: "PAYE" },
    { label: "Annulé", value: "ANNULE" },
];

const typeFilterOptions = [
    { label: "Reçu (client→nous)", value: "RECU" },
    { label: "Émis (nous→fournisseur)", value: "EMIS" },
];

export function EffetsClient() {
    const router = useRouter();
    const searchInput = useEffetsStore((s) => s.searchInput);
    const setSearchInput = useEffetsStore((s) => s.setSearchInput);
    const statusFilter = useEffetsStore((s) => s.statusFilter);
    const setStatusFilter = useEffetsStore((s) => s.setStatusFilter);
    const typeFilter = useEffetsStore((s) => s.typeFilter);
    const setTypeFilter = useEffetsStore((s) => s.setTypeFilter);
    const { data, isFetching, isLoading } = useEffetsList();
    const { deleteEffet, updateStatus } = useEffetsMutations();

    const { data: alertsData } = useEffetsEcheances();

    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
        try { return new Set(JSON.parse(localStorage.getItem("effets-alertes-dismissed") || "[]")) }
        catch { return new Set<string>() }
    })
    const dismissAlert = useCallback((key: string) => {
        setDismissedAlerts(prev => {
            const next = new Set(prev)
            next.add(key)
            localStorage.setItem("effets-alertes-dismissed", JSON.stringify([...next]))
            return next
        })
    }, [])

    if (isLoading) {
        return (
            <div className="flex-1 p-3 md:p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-80 rounded-lg" />
            </div>
        );
    }

    const { stats, effets } = data ?? { stats: { totalMontant: "0", enPortefeuille: 0, remisEscompte: 0, endosse: 0, impaye: 0, paye: 0, total: 0 }, effets: [] };

    const columns: ColumnDef<SerializedEffet>[] = [
        {
            accessorKey: "numero",
            header: "N° Effet",
            cell: (info) => <span className="text-sm font-mono font-medium">{info.renderValue() as string}</span>,
        },
        {
            accessorKey: "ordrePaiementNumero",
            header: "Ordre de paiement",
            cell: (info) => <span className="text-sm font-mono">{(info.renderValue() as string | null) ?? "—"}</span>,
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: (info) => {
                const type = info.renderValue() as EffetType;
                return type === "RECU" ? (
                    <Badge variant="outline" className="gap-1 text-xs">
                        <ArrowDownToLine className="h-3 w-3 text-blue-600" />
                        Reçu
                    </Badge>
                ) : (
                    <Badge variant="outline" className="gap-1 text-xs">
                        <ArrowUpFromLine className="h-3 w-3 text-amber-600" />
                        Émis
                    </Badge>
                );
            },
        },
        {
            accessorKey: "tire",
            header: "Tiré",
            cell: (info) => <span className="text-sm font-medium">{info.renderValue() as string}</span>,
        },
        {
            accessorKey: "tireur",
            header: "Tireur",
            cell: (info) => <span className="text-sm">{info.row.original.beneficiaire ?? "—"}</span>,
        },
        {
            accessorKey: "montant",
            header: "Montant",
            cell: (info) => <MoneyCell value={info.renderValue() as string} className="text-sm font-semibold" />,
            meta: { align: "right" },
        },
        {
            accessorKey: "banque",
            header: "Banque",
            cell: (info) => {
                const banque =
                    info.row.original.type === "EMIS"
                        ? info.row.original.tireBanque ?? info.row.original.companyBank?.nomBanque ?? "—"
                        : info.row.original.companyBank?.nomBanque ?? "—";
                return <span className="text-sm">{banque}</span>;
            },
        },
        {
            accessorKey: "dateEcheance",
            header: "Échéance",
            cell: (info) => <DateCell value={info.renderValue() as Date} className="text-sm" />,
        },
        {
            accessorKey: "status",
            header: "Statut",
            cell: (info) => <EffetStatusBadge status={info.renderValue() as EffetStatus} />,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const e = row.original;
                const canModify = e.status === "EN_PORTEFEUILLE";
                const canRemettre = e.status === "EN_PORTEFEUILLE";
                const canEndosser = e.status === "EN_PORTEFEUILLE";
                const canImpaye = e.status === "REMIS_ESCOMPTE" || e.status === "ENDOSSE";
                const canDelete = e.status === "EN_PORTEFEUILLE";

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2 text-sm" asChild>
                                <Link href={`/effets/${e.id}`}>
                                    <Eye className="h-4 w-4" /> Voir détail
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {canRemettre && (
                                <DropdownMenuItem className="gap-2 text-sm" onClick={() => updateStatus.mutate({ id: e.id, status: "REMIS_ESCOMPTE" as EffetStatus })}>
                                    <Landmark className="h-4 w-4 text-indigo-600" /> Remettre à l&apos;escompte
                                </DropdownMenuItem>
                            )}
                            {canEndosser && (
                                <DropdownMenuItem className="gap-2 text-sm" onClick={() => updateStatus.mutate({ id: e.id, status: "ENDOSSE" as EffetStatus })}>
                                    <ArrowLeftRight className="h-4 w-4 text-purple-600" /> Endosser
                                </DropdownMenuItem>
                            )}
                            {canImpaye && (
                                <DropdownMenuItem className="gap-2 text-sm" onClick={() => updateStatus.mutate({ id: e.id, status: "IMPAYE" as EffetStatus })}>
                                    <Ban className="h-4 w-4 text-red-600" /> Marquer Impayé
                                </DropdownMenuItem>
                            )}
                            {e.status !== "ANNULE" && e.status !== "PAYE" && (
                                <DropdownMenuItem className="gap-2 text-sm" onClick={() => updateStatus.mutate({ id: e.id, status: "PAYE" as EffetStatus })}>
                                    <CheckCircle2 className="h-4 w-4 text-green-600" /> Marquer Payé
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {canDelete && (
                                <DropdownMenuItem className="gap-2 text-sm text-red-600" onClick={() => deleteEffet.mutate(e.id)}>
                                    <Trash2 className="h-4 w-4" /> Supprimer
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const impayesCount = stats?.impaye ?? 0
    const pastDueCount = alertsData?.alerts?.filter(a => a.joursRestants < 0)?.length ?? 0
    const upcomingAlerts = alertsData?.alerts?.filter((a) => a.joursRestants <= 5 && a.joursRestants >= 0) ?? [];

    const alertes: { key: string; variant: "destructive" | "warning" | "info"; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }[] = []

    if (impayesCount > 0 && !dismissedAlerts.has("impayes")) {
        alertes.push({ key: "impayes", variant: "destructive", icon: Ban, title: `${impayesCount} effet(s) impayé(s)`, desc: "Des effets sont marqués comme impayés. Vérifiez les motifs et les frais de protêt." })
    }
    if (pastDueCount > 0 && !dismissedAlerts.has("past-due")) {
        alertes.push({ key: "past-due", variant: "destructive", icon: AlertTriangle, title: `${pastDueCount} effet(s) en retard`, desc: "Des effets ont dépassé leur date d'échéance sans être payés." })
    }
    if (upcomingAlerts.length > 0 && !dismissedAlerts.has("upcoming")) {
        alertes.push({ key: "upcoming", variant: "warning", icon: Bell, title: `${upcomingAlerts.length} effet(s) arrivant à échéance`, desc: upcomingAlerts.map(a => `${a.numero} (${a.joursRestants === 0 ? "Aujourd'hui" : `J-${a.joursRestants}`})`).join(" · ") })
    }

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="flex items-center justify-end">
                <Button variant="outline" size="sm" asChild>
                    <Link href="/effets/imprimer">
                        <Printer className="h-4 w-4 mr-2" /> Imprimer des effets émis
                    </Link>
                </Button>
            </div>
            {alertes.length > 0 && (
                <div className="space-y-2">
                    {alertes.map(a => {
                        const variantStyles = {
                            destructive: "border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800",
                            warning: "border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800",
                            info: "border-blue-300 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800",
                        }
                        const iconStyles = {
                            destructive: "text-red-600",
                            warning: "text-amber-600",
                            info: "text-blue-600",
                        }
                        const titleStyles = {
                            destructive: "text-red-800 dark:text-red-300",
                            warning: "text-amber-800 dark:text-amber-300",
                            info: "text-blue-800 dark:text-blue-300",
                        }
                        const descStyles = {
                            destructive: "text-red-700 dark:text-red-400",
                            warning: "text-amber-700 dark:text-amber-400",
                            info: "text-blue-700 dark:text-blue-400",
                        }
                        const Icon = a.icon
                        return (
                            <Alert key={a.key} className={`${variantStyles[a.variant]} pr-3`}>
                                <Icon className={`h-4 w-4 ${iconStyles[a.variant]}`} />
                                <AlertTitle className={`text-sm font-medium ${titleStyles[a.variant]}`}>
                                    {a.title}
                                </AlertTitle>
                                <AlertDescription className={`text-xs ${descStyles[a.variant]}`}>
                                    {a.desc}
                                </AlertDescription>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 absolute top-2.5 right-2 shrink-0"
                                    onClick={() => dismissAlert(a.key)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </Alert>
                        )
                    })}
                </div>
            )}
            <KpiGrid className="grid-cols-2 sm:grid-cols-5 lg:grid-cols-5 gap-3">
                <StatCard title="Total Effets" value={String(stats.total)} subtitle={formatTND(stats.totalMontant)} />
                <StatCard title="En Portefeuille" value={String(stats.enPortefeuille)} subtitle="Disponibles" />
                <StatCard title="Remis Escompte" value={String(stats.remisEscompte)} subtitle="À la banque" />
                <StatCard title="Endossés" value={String(stats.endosse)} subtitle="Transférés" />
                <StatCard title="Impayés" value={String(stats.impaye)} subtitleVariant={stats.impaye > 0 ? "danger" : "default"} subtitle={`${stats.impaye} effet(s)`} />
            </KpiGrid>

            <DataTable
                columns={columns}
                data={effets}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher (N°, tiré, bénéficiaire...)"
                enableColumnVisibility
                facetedFilters={[
                    {
                        columnId: "status",
                        title: "Statut",
                        options: statusFilterOptions.map((o) => ({ label: o.label, value: o.value })),
                    },
                    {
                        columnId: "type",
                        title: "Type",
                        options: typeFilterOptions.map((o) => ({ label: o.label, value: o.value })),
                    },
                ]}
                enableMultiSort
                onRowClick={(effet) => router.push(`/effets/${effet.id}`)}
                renderEmpty={() => (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia><IllusEmptyDocs /></EmptyMedia>
                            <EmptyTitle>Aucun effet</EmptyTitle>
                            <EmptyDescription>
                                Aucun effet de commerce trouvé.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            />
        </div>
    );
}
