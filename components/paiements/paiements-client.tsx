"use client";

import { usePaymentsList } from "@/hooks/use-queries";
import { usePaymentsSearch } from "@/hooks/use-payments-search";
import { StatCard } from "@/components/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/decimal";
import { Banknote } from "lucide-react";
import { DataTable } from "@/components/data-table";
import type { PaymentMethod } from "@/lib/types";
import { modeReglementIcon, modeReglementLabel } from "@/components/shared/mode-reglement-badge";
import { methodFilterDef, usePaiementsColumns } from "@/components/paiements/paiements-columns";

export function PaiementsClient({ defaultMethod }: { defaultMethod?: PaymentMethod }) {
    const { searchInput, setSearchInput, methodFilter } = usePaymentsSearch();
    const columns = usePaiementsColumns();

    // Filtre serveur : la prop de route priorise (ex-useEffect qui écrivait
    // `methodFilter` dans le store puis relisait `method: methodFilter`) — la
    // prop EST la valeur, aucune écriture store nécessaire (ce champ n'est lu
    // que par cette query, grep : use-payments-search est son seul consumer).
    const { data, isFetching, isLoading } = usePaymentsList({
        search: searchInput || undefined,
        method: defaultMethod ?? methodFilter,
    });

    const stats = data?.stats;
    const methodBreakdown = stats?.methodBreakdown ?? {};

    if (isLoading) {
        return (
            <div className="flex-1 p-4 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
                <StatCard
                    title="Total Encaissements"
                    value={formatCurrency(stats?.totalEncaisse ?? "0", "TND")}
                    subtitle={`${stats?.total ?? 0} paiements`}
                    icon={Banknote}
                />
                {Object.entries(methodBreakdown).map(([method, info]) => (
                    <StatCard
                        key={method}
                        title={modeReglementLabel(method)}
                        value={formatCurrency(info.total, "TND")}
                        subtitle={`${info.count} paiements`}
                        icon={modeReglementIcon(method)}
                    />
                ))}
                {Object.keys(methodBreakdown).length === 0 && (
                    <>
                        <StatCard title="Espèces" value="0 TND" subtitle="0 paiements" icon={Banknote} />
                        <StatCard title="Virement" value="0 TND" subtitle="0 paiements" icon={modeReglementIcon("VIREMENT")} />
                        <StatCard title="Carte" value="0 TND" subtitle="0 paiements" icon={modeReglementIcon("CARTE")} />
                    </>
                )}
            </div>

            <DataTable
                columns={columns}
                data={data?.payments ?? []}
                loading={isFetching}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher (réf., notes...)"
                facetedFilters={[methodFilterDef]}
                enableColumnVisibility
                pageSize={20}
                pageSizeOptions={[10, 20, 50, 100]}
            />
        </div>
    );
}
