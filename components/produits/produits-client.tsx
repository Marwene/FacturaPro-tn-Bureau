"use client";

import { useProduitsList, useProduitsMutations } from "@/hooks/use-produits";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { notify } from "@/lib/notify";
import { useProduitsStore } from "@/lib/stores/produits-store";
import { StatCard } from "@/components/stat-card";
import { StockStatusBadge } from "@/components/status-badge";
import { StockAlertBanner } from "@/components/produits/stock-alert-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/data-table";
import { formatTND } from "@/lib/decimal";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { IllusEmptyBox } from "@/components/ui/illustrations";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Edit, Package, QrCode, Eye, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedProduct, StockStatus } from "@/lib/types";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useMemo } from "react";
import { ProductQRCode } from "./product-qr-code";
import { generateProductQRData } from "@/lib/qr-data";

function getColumns(onDelete: (product: SerializedProduct) => void): ColumnDef<SerializedProduct>[] {
    return [
        {
            accessorKey: "code",
            header: "Code",
            cell: (info) => (
                <span className="text-sm font-mono font-medium">{info.renderValue() as string}</span>
            ),
        },
        {
            id: "produit",
            accessorKey: "nom",
            header: "Produit",
            cell: (info) => {
                const row = info.row.original;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted shrink-0">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate">{row.nom}</p>
                                {row.estSurCommande && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                        <span className="inline-block h-1 w-1 rounded-full bg-amber-500" />
                                        Sur commande
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate max-w-[260px]">{row.description ?? ""}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "categorieName",
            header: "Catégorie",
            cell: (info) => <span className="text-sm">{String(info.renderValue() ?? "—")}</span>,
        },
        {
            id: "suppliers",
            header: "Fournisseurs",
            cell: (info) => {
                if (!FEATURE_FLAGS.SHOW_SUPPLIERS_LISTING) return null;
                const suppliers = info.row.original.suppliers ?? [];
                if (suppliers.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
                return (
                    <div className="flex flex-col gap-0.5">
                        {suppliers.map((s) => (
                            <div key={s.productSupplierId} className="flex items-center gap-1 text-xs">
                                {s.isDefault && <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />}
                                <span className="truncate">{s.supplierName}</span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
        {
            id: "purchasePrices",
            header: "Prix Achat",
            cell: (info) => {
                if (!FEATURE_FLAGS.SHOW_SUPPLIERS_LISTING) return null;
                const suppliers = info.row.original.suppliers ?? [];
                if (suppliers.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
                return (
                    <div className="flex flex-col gap-0.5">
                        {suppliers.map((s) => (
                            <div key={s.productSupplierId} className="flex items-center gap-1 text-xs tabular-nums">
                                {s.isDefault && <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />}
                                <span>{formatTND(s.purchasePrice)}</span>
                            </div>
                        ))}
                    </div>
                );
            },
        },
    {
        id: "salePrices",
        header: "Prix Vente",
        cell: (info) => {
            const row = info.row.original;
            return (
                <span className="text-sm font-medium tabular-nums">{formatTND(row.prixHT)}</span>
            );
        },
    },
        {
            accessorKey: "tauxTVA",
            header: "TVA",
            cell: (info) => <span className="text-sm">{String(info.renderValue())}%</span>,
        },
        {
            accessorKey: "fodec",
            header: "FODEC",
            cell: (info) => {
                const row = info.row.original;
                return info.renderValue() ? (
                    <span className="text-xs">{row.tauxFodec}%</span>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                );
            },
        },
        {
            id: "stock",
            header: "Stock",
            cell: (info) => {
                const row = info.row.original;
                const current = parseFloat(row.stockActuel);
                const min = parseFloat(row.stockMinimum);
                const pct = min > 0 ? Math.min((current / (min * 3)) * 100, 100) : 80;
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-[60px]">
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${row.stockStatus === "CRITIQUE"
                                        ? "bg-red-500"
                                        : row.stockStatus === "RUPTURE"
                                            ? "bg-red-800"
                                            : "bg-emerald-500"
                                        }`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                        <span className="text-sm text-right whitespace-nowrap">
                            {row.stockActuel} {row.unite}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "stockStatus",
            header: "Statut Stock",
            cell: (info) => <StockStatusBadge status={info.renderValue() as StockStatus} />,
        },
        {
            id: "qr",
            header: "",
            cell: ({ row }) => {
                const [open, setOpen] = useState(false);
                const p = row.original;
                const qrData = generateProductQRData({
                    id: p.id,
                    code: p.code,
                    nom: p.nom,
                    description: p.description,
                    categorie: p.categorieName,
                    prixHT: p.prixHT,
                    tauxTVA: p.tauxTVA,
                    stockActuel: p.stockActuel,
                    unite: p.unite,
                });
                return (
                    <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
                            <QrCode className="h-4 w-4" />
                        </Button>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogContent className="sm:max-w-sm">
                                <DialogHeader>
                                    <DialogTitle>{p.code} · {p.nom}</DialogTitle>
                                    <DialogDescription>
                                        Scannez pour afficher la fiche produit
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-center py-4">
                                    <ProductQRCode codeBarre={qrData} nom={p.nom} code={p.code} large />
                                </div>
                                <div className="text-center text-xs text-muted-foreground">
                                    Ouvrez votre caméra, et scanner le QR code pour obtenir télécharger la fiche technique, et les informations du produits.
                                </div>
                                <DialogFooter className="sm:justify-center">
                                    <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                                        Fermer
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2 text-sm" asChild>
                            <Link href={`/produits/${row.original.id}`}>
                                <Eye className="h-4 w-4" /> Voir le détail
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-sm" asChild>
                            <Link href={`/produits/${row.original.id}`}>
                                <Edit className="h-4 w-4" /> Modifier
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            className="gap-2 text-sm text-destructive focus:text-destructive"
                            onClick={() => onDelete(row.original)}
                        >
                            <Trash2 className="h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];
}

export function ProduitsClient() {
    const router = useRouter();
    const { searchInput, setSearchInput, categorieFilter, setCategorieFilter, stockStatusFilter, setStockStatusFilter, prixMinFilter, setPrixMinFilter, prixMaxFilter, setPrixMaxFilter, supplierFilter, setSupplierFilter } = useProduitsStore();
    const { data, isLoading } = useProduitsList();
    const [deleteTarget, setDeleteTarget] = useState<SerializedProduct | null>(null);
    const deleteMutation = useProduitsMutations().deleteProduct;

    const supplierOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of data?.products ?? []) {
            for (const s of p.suppliers ?? []) {
                if (!map.has(s.supplierId)) map.set(s.supplierId, s.supplierName);
            }
        }
        return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    }, [data?.products]);

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
    const critiques = (data?.products ?? []).filter(
        (p) => p.stockStatus === "CRITIQUE" || p.stockStatus === "RUPTURE"
    );
    const ruptures = critiques.filter((p) => p.stockStatus === "RUPTURE").length;

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {critiques.length > 0 && (
                <StockAlertBanner
                    ruptures={ruptures}
                    critiques={critiques.length - ruptures}
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
                columns={getColumns(setDeleteTarget)}
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
