"use client";

import { useProduitsList, useProduitsMutations } from "@/hooks/use-produits";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { notify } from "@/lib/notify";
import { useProduitsStore } from "@/lib/stores/produits-store";
import { StatCard } from "@/components/stat-card";
import { StockAlertBanner } from "@/components/produits/stock-alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table";
import { formatTND } from "@/lib/decimal";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyBox } from "@/components/ui/illustrations";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { SerializedProduct } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { getProduitsColumns } from "./produits-columns";
import { computeSupplierOptions, summarizeStockAlerts } from "./produits-list-logic";

/**
 * Façade du listing produits — colonnes : `produits-columns.tsx`,
 * logique pure : `produits-list-logic.ts` (lot I, découpage des gros composants).
 */
export function ProduitsClient() {
    const router = useRouter();
    const { searchInput, setSearchInput, categorieFilter, setCategorieFilter, stockStatusFilter, setStockStatusFilter, prixMinFilter, setPrixMinFilter, prixMaxFilter, setPrixMaxFilter, supplierFilter, setSupplierFilter } = useProduitsStore();
    const { data, isLoading } = useProduitsList();
    const [deleteTarget, setDeleteTarget] = useState<SerializedProduct | null>(null);
    const deleteMutation = useProduitsMutations().deleteProduct;

    const supplierOptions = useMemo(
        () => computeSupplierOptions(data?.products ?? []),
        [data?.products],
    );

    const handleDelete = () => {
        if (!deleteTarget) return;
        deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => {
                notify.success({ title: `Produit « ${deleteTarget.nom} » supprimé` });
                setDeleteTarget(null);
            },
            onError: (err: unknown) => {
                notify.error({
                    title: "Suppression du produit impossible",
                    error: err,
                    context: "lors de la suppression du produit depuis la liste",
                });
            },
        });
    };

    if (isLoading) {
        return (
            <div className="flex-1 p-3 md:p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-96 rounded-lg" />
            </div>
        );
    }

    const { stats, categories } = data ?? {};
    const { critiques, ruptures } = summarizeStockAlerts(data?.products ?? []);

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {critiques > 0 && (
                <StockAlertBanner
                    ruptures={ruptures}
                    critiques={critiques - ruptures}
                    onGestionStock={() => setStockStatusFilter("CRITIQUE")}
                />
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard title="Total Produits" value={String(stats?.totalProduits ?? 0)} subtitle="Actifs" />
                <StatCard title="Valeur du Stock" value={formatTND(stats?.valeurStock ?? "0")} subtitle="Prix de revient HT" />
                <StatCard title="Alertes Stock" value={String(stats?.alertesStock ?? 0)} subtitle="À réapprovisionner" subtitleVariant={Number(stats?.alertesStock) > 0 ? "danger" : "default"} />
                <StatCard title="Catégories" value={String(stats?.categories ?? 0)} subtitle="Familles de produits" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Select value={stockStatusFilter} onValueChange={setStockStatusFilter}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue placeholder="Stock" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL" className="text-xs">Tous les stocks</SelectItem>
                        <SelectItem value="OK" className="text-xs">OK</SelectItem>
                        <SelectItem value="CRITIQUE" className="text-xs">Critique</SelectItem>
                        <SelectItem value="RUPTURE" className="text-xs">Rupture</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    type="number" min="0" step="0.001" placeholder="Prix min"
                    value={prixMinFilter}
                    onChange={(e) => setPrixMinFilter(e.target.value)}
                    className="h-8 w-28 text-xs"
                />
                <Input
                    type="number" min="0" step="0.001" placeholder="Prix max"
                    value={prixMaxFilter}
                    onChange={(e) => setPrixMaxFilter(e.target.value)}
                    className="h-8 w-28 text-xs"
                />
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue placeholder="Fournisseur" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL" className="text-xs">Tous les fournisseurs</SelectItem>
                        {supplierOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {(stockStatusFilter !== "ALL" || prixMinFilter || prixMaxFilter || supplierFilter !== "ALL") && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setStockStatusFilter("ALL"); setPrixMinFilter(""); setPrixMaxFilter(""); setSupplierFilter("ALL"); }}>
                        Réinitialiser
                    </Button>
                )}
            </div>

            <DataTable
                columns={getProduitsColumns(setDeleteTarget)}
                data={data?.products ?? []}
                loading={isLoading}
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                searchPlaceholder="Rechercher (code, nom, catégorie...)"
                enableColumnVisibility
                facetedFilters={[
                    {
                        columnId: "categorieName",
                        title: "Catégorie",
                        options: (categories ?? []).filter(Boolean).map((cat) => ({ label: cat!, value: cat! })),
                    },
                    {
                        columnId: "stockStatus",
                        title: "Stock",
                        options: [
                            { label: "OK", value: "OK" },
                            { label: "Critique", value: "CRITIQUE" },
                            { label: "Rupture", value: "RUPTURE" },
                        ],
                    },
                ]}
                enableMultiSort
                //onRowClick={(product) => router.push(`/produits/${product.id}`)}
                renderEmpty={() => (
                    <Empty>
                        <EmptyHeader>
                            <EmptyMedia><IllusEmptyBox /></EmptyMedia>
                            <EmptyTitle>Aucun produit</EmptyTitle>
                            <EmptyDescription>
                                Ajoutez votre premier produit pour commencer &agrave; g&eacute;rer votre stock.
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            />

            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                onConfirm={handleDelete}
                title={`Supprimer ${deleteTarget?.nom ?? ""} ?`}
                description="Cette action est irréversible. Le produit sera définitivement supprimé."
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
}
