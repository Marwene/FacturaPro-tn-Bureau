"use client";

import { useMemo, useState } from "react";
import { useCompanyStore } from "@/lib/stores/company-store";
import { useCompany } from "@/hooks/use-company-query";
import { useEmisEffets } from "@/hooks/use-effets";
import { StatCard } from "@/components/stat-card";
import { DataTable } from "@/components/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyDocs } from "@/components/ui/illustrations";
import { formatTND } from "@/lib/decimal";
import { PageHeader } from "@/components/shared/page-header";
import { KpiGrid } from "@/components/shared/kpi-grid";
import { DateCell } from "@/components/shared/date-cell";
import { MoneyCell } from "@/components/shared/money-cell";
import { ApercuEffetDialog } from "./apercu-effet-dialog";
import { getEffetPrintWarnings } from "./lettre-de-change";
import { AlertTriangle, ArrowLeft, Printer } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedEffet, EffetStatus } from "@/lib/types";
import Link from "next/link";

const statusOptions: { label: string; value: EffetStatus }[] = [
    { label: "En portefeuille", value: "EN_PORTEFEUILLE" },
    { label: "Remis à l'escompte", value: "REMIS_ESCOMPTE" },
    { label: "Endossé", value: "ENDOSSE" },
];

function useCompanyId() {
    return useCompanyStore((s) => s.selectedCompanyId);
}

export function ImpressionEffetsClient() {
    const [status, setStatus] = useState<EffetStatus>("EN_PORTEFEUILLE");
    const [echeanceFrom, setEcheanceFrom] = useState("");
    const [echeanceTo, setEcheanceTo] = useState("");
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<SerializedEffet[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);

    const { data, isLoading } = useEmisEffets(status);
    const companyId = useCompanyId();
    const { data: companyData } = useCompany(companyId ?? null);

    const effets = useMemo(() => {
        let list = data?.effets ?? [];
        if (echeanceFrom) list = list.filter((e) => new Date(e.dateEcheance) >= new Date(echeanceFrom));
        if (echeanceTo) list = list.filter((e) => new Date(e.dateEcheance) <= new Date(echeanceTo));
        return list;
    }, [data, echeanceFrom, echeanceTo]);

    const totalSelected = selected.reduce((s, e) => s + parseFloat(e.montant || "0"), 0);
    const incompleteSelected = selected.filter((e) => getEffetPrintWarnings(e).length > 0);

    const columns: ColumnDef<SerializedEffet>[] = [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                    aria-label="Tout sélectionner"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(v) => row.toggleSelected(!!v)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Sélectionner"
                />
            ),
            enableSorting: false,
        },
        {
            accessorKey: "numero",
            header: "N° Effet",
            cell: (info) => <span className="text-sm font-mono font-medium">{info.renderValue() as string}</span>,
        },
        {
            accessorKey: "beneficiaire",
            header: "Bénéficiaire",
            cell: (info) => <span className="text-sm">{info.renderValue() as string}</span>,
        },
        {
            accessorKey: "tire",
            header: "Tiré",
            cell: (info) => <span className="text-sm">{info.renderValue() as string}</span>,
        },
        {
            accessorKey: "dateEcheance",
            header: "Échéance",
            cell: (info) => <DateCell value={info.renderValue() as Date} className="text-sm" />,
        },
        {
            accessorKey: "montant",
            header: "Montant",
            cell: (info) => <MoneyCell value={info.renderValue() as string} className="text-sm font-semibold" />,
            meta: { align: "right" },
        },
        {
            id: "warnings",
            header: "Prêt à imprimer",
            cell: ({ row }) => {
                const warnings = getEffetPrintWarnings(row.original);
                if (warnings.length === 0) {
                    return <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">OK</Badge>;
                }
                return (
                    <Badge variant="destructive" className="gap-1 text-xs" title={warnings.join(", ")}>
                        <AlertTriangle className="h-3 w-3" /> {warnings.length} champ(s)
                    </Badge>
                );
            },
        },
    ];

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/effets">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <PageHeader
                    title="Impression des effets émis"
                    description="Sélectionnez un ou plusieurs effets à imprimer sur le pré-imprimé (format B5)"
                    className="min-w-0"
                />
            </div>

            <KpiGrid className="grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard title="Effets" value={String(effets.length)} subtitle={statusOptions.find(s => s.value === status)?.label} />
                <StatCard title="Total montant" value={formatTND(effets.reduce((s, e) => s + parseFloat(e.montant), 0).toFixed(3))} />
                <StatCard title="Sélectionnés" value={String(selected.length)} subtitle={formatTND(totalSelected.toFixed(3))} />
                <StatCard
                    title="Incomplets sélectionnés"
                    value={String(incompleteSelected.length)}
                    subtitleVariant={incompleteSelected.length > 0 ? "danger" : "default"}
                    subtitle={incompleteSelected.length > 0 ? "Champs manquants" : "Tous complets"}
                />
            </KpiGrid>

            <div className="flex flex-wrap items-center gap-2">
                {statusOptions.map((o) => (
                    <Button
                        key={o.value}
                        size="sm"
                        variant={status === o.value ? "default" : "outline"}
                        onClick={() => setStatus(o.value)}
                    >
                        {o.label}
                    </Button>
                ))}
                <div className="flex items-center gap-2 ml-auto">
                    <Input
                        type="date"
                        value={echeanceFrom}
                        onChange={(e) => setEcheanceFrom(e.target.value)}
                        className="h-8 w-36 text-xs"
                        placeholder="Échéance de"
                    />
                    <span className="text-xs text-muted-foreground">à</span>
                    <Input
                        type="date"
                        value={echeanceTo}
                        onChange={(e) => setEcheanceTo(e.target.value)}
                        className="h-8 w-36 text-xs"
                        placeholder="Échéance à"
                    />
                </div>
            </div>

            {isLoading ? (
                <Skeleton className="h-80 rounded-lg" />
            ) : (
                <DataTable
                    columns={columns}
                    data={effets}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Rechercher (N°, tiré, bénéficiaire...)"
                    enableRowSelection
                    onSelectedRowsChange={setSelected}
                    renderEmpty={() => (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia><IllusEmptyDocs /></EmptyMedia>
                                <EmptyTitle>Aucun effet émis</EmptyTitle>
                                <EmptyDescription>
                                    Aucun effet émis ne correspond à ces filtres.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    )}
                />
            )}

            {selected.length > 0 && (
                <div className="sticky bottom-3 flex items-center justify-between gap-3 border rounded-lg bg-background shadow-lg px-4 py-3">
                    <span className="text-sm">
                        <strong>{selected.length}</strong> effet(s) sélectionné(s) · <MoneyCell value={totalSelected.toFixed(3)} />
                        {incompleteSelected.length > 0 && (
                            <span className="text-destructive ml-2">
                                <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
                                {incompleteSelected.length} incomplet(s) — vérifiez avant impression
                            </span>
                        )}
                    </span>
                    <Button onClick={() => setPreviewOpen(true)}>
                        <Printer className="h-4 w-4 mr-2" /> Aperçu et impression
                    </Button>
                </div>
            )}

            {selected.length > 0 && (
                <ApercuEffetDialog
                    open={previewOpen}
                    onOpenChange={setPreviewOpen}
                    effets={selected}
                    companyName={companyData?.company?.name}
                />
            )}
        </div>
    );
}
