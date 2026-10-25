"use client"

import { useState, useDeferredValue } from "react"
import { StatCard } from "@/components/stat-card"
import { Badge } from "@/components/ui/badge"
import { StockStatusBadge } from "@/components/status-badge"
import type { StockStatus } from "@/lib/types"
import { RotateCcw, ArrowUpRight, TrendingDown } from "lucide-react"
import Link from "next/link"
import { useStockMouvements } from "@/hooks/use-stock-mouvements"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { FacetedFilterDef } from "@/components/data-table/types"

type MouvementRow = {
    id: string
    date: string
    type: string
    quantite: number
    notes: string | null
    product: {
        id: string
        nom: string
        code: string
        stockActuel: number
        stockStatus: string
    } | null
}

const columns: ColumnDef<MouvementRow>[] = [
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => {
            const date = getValue() as string
            return (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(date).toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
            )
        },
    },
    {
        accessorFn: (row) => row.product?.nom ?? "",
        id: "produit",
        header: "Produit",
        cell: ({ row }) => {
            const m = row.original
            return (
                <span className="text-xs font-medium">
                    {m.product ? (
                        <Link href={`/produits/${m.product.id}`} className="hover:underline">
                            {m.product.nom}
                        </Link>
                    ) : (
                        "—"
                    )}
                </span>
            )
        },
    },
    {
        accessorFn: (row) => row.product?.code ?? "",
        id: "code",
        header: "Code",
        cell: ({ row }) => (
            <span className="text-xs font-mono text-muted-foreground">
                {row.original.product?.code ?? "—"}
            </span>
        ),
    },
    {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => {
            const type = getValue() as string
            return (
                <Badge
                    variant="outline"
                    className={
                        type === "ENTREE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                            : type === "SORTIE"
                                ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
                                : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800"
                    }
                >
                    {type === "ENTREE" ? "Entrée" : type === "SORTIE" ? "Sortie" : "Ajust."}
                </Badge>
            )
        },
    },
    {
        accessorKey: "quantite",
        header: () => <div className="text-right">Quantité</div>,
        cell: ({ getValue, row }) => {
            const quantite = getValue() as number
            const type = row.original.type
            return (
                <span className="text-xs text-right font-mono font-semibold">
                    <span className={type === "ENTREE" ? "text-emerald-600" : "text-red-600"}>
                        {type === "ENTREE" ? "+" : "-"}{quantite}
                    </span>
                </span>
            )
        },
    },
    {
        accessorFn: (row) => row.product?.stockActuel ?? 0,
        id: "stockActuel",
        header: "Stock Actuel",
        cell: ({ row }) => {
            const m = row.original
            return m.product ? (
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono">{m.product.stockActuel}</span>
                    <StockStatusBadge status={m.product.stockStatus as StockStatus} />
                </div>
            ) : (
                "—"
            )
        },
    },
    {
        accessorKey: "notes",
        header: "Notes",
        cell: ({ getValue }) => (
            <span className="text-xs text-muted-foreground max-w-[150px] truncate block">
                {(getValue() as string) ?? "—"}
            </span>
        ),
    },
]

const typeFilterDef: FacetedFilterDef = {
    columnId: "type",
    title: "Type",
    options: [
        { value: "ENTREE", label: "Entrées", icon: ArrowUpRight },
        { value: "SORTIE", label: "Sorties", icon: TrendingDown },
        { value: "AJUSTEMENT", label: "Ajustements", icon: RotateCcw },
    ],
}

export function MouvementsClient() {
    const [search, setSearch] = useState("")
    const deferredSearch = useDeferredValue(search)
    const [page, setPage] = useState(1)
    const handleSearch = (val: string) => { setSearch(val); setPage(1) }

    const params = new URLSearchParams()
    if (deferredSearch) params.set("search", deferredSearch)
    params.set("page", String(page))
    params.set("limit", "30")

    const { data, isLoading } = useStockMouvements(params)

    const mouvements = (data?.mouvements ?? []) as MouvementRow[]

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Stats */}
            {data && (
                <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        title="Total Mouvements"
                        value={String(data.stats.total)}
                        icon={ArrowUpRight}
                        subtitle={`${data.stats.totalPages} page(s)`}
                        trend={`Entrées: ${data.stats.entreeCount} · Sorties: ${data.stats.sortieCount}`}
                    />
                    <StatCard
                        title="Entrées"
                        value={String(data.stats.entreeCount)}
                        icon={ArrowUpRight}
                        subtitle={`${data.stats.entreeSum} unités reçues`}
                        subtitleVariant="success"
                        trend={`Moy. ${data.stats.entreeCount > 0 ? Math.round(data.stats.entreeSum / data.stats.entreeCount) : 0} unités/mouvement`}
                        trendVariant="up"
                    />
                    <StatCard
                        title="Sorties"
                        value={String(data.stats.sortieCount)}
                        icon={TrendingDown}
                        subtitle={`${data.stats.sortieSum} unités sorties`}
                        subtitleVariant="danger"
                        trend={`Moy. ${data.stats.sortieCount > 0 ? Math.round(data.stats.sortieSum / data.stats.sortieCount) : 0} unités/mouvement`}
                        trendVariant="down"
                    />
                    <StatCard
                        title="Solde Net"
                        value={`${data.stats.entreeSum - data.stats.sortieSum > 0 ? "+" : ""}${data.stats.entreeSum - data.stats.sortieSum}`}
                        icon={RotateCcw}
                        subtitle={data.stats.entreeSum - data.stats.sortieSum > 0 ? "Plus d'entrées que de sorties" : data.stats.entreeSum - data.stats.sortieSum < 0 ? "Plus de sorties que d'entrées" : "Équilibré"}
                        subtitleVariant={data.stats.entreeSum - data.stats.sortieSum > 0 ? "success" : data.stats.entreeSum - data.stats.sortieSum < 0 ? "danger" : "default"}
                        trend={`Taux: ${data.stats.total > 0 ? Math.round(((data.stats.entreeSum - data.stats.sortieSum) / data.stats.total) * 100) : 0}%`}
                    />
                </div>
            )}

            {/* Table */}
            <DataTable
                columns={columns}
                data={mouvements}
                loading={isLoading}
                searchValue={search}
                onSearchChange={handleSearch}
                searchPlaceholder="Rechercher un produit..."
                facetedFilters={[typeFilterDef]}
                enableColumnVisibility
                pageSize={30}
                pageSizeOptions={[10, 20, 30, 50]}
                emptyMessage="Aucun mouvement trouvé"
            />
        </div>
    )
}
