"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { StockStatusBadge } from "@/components/status-badge"
import type { StockStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { FacetedFilterDef } from "@/components/data-table/types"
import { formatTND } from "@/lib/decimal"
import { Package, AlertTriangle, TrendingDown, BarChart3, ArrowUpRight, RotateCcw } from "lucide-react"
import Link from "next/link"
import { useInventaire } from "@/hooks/use-inventaire"

type AlertRow = {
    id: string
    code: string
    nom: string
    stockActuel: number
    stockMinimum: number
    stockStatus: string
    categorie: string | null
}

type TopProduitRow = {
    id: string
    code: string
    nom: string
    stockActuel: number
    stockMinimum: number
    stockStatus: string
    valeur: number
    prixHT: number
    categorie: string | null
}

type CategorieRow = {
    id: string
    nom: string
    count: number
    valeur: string
}

type MouvementRow = {
    id: string
    type: string
    quantite: number
    date: string
    product: { id: string; code: string; nom: string } | null
}

const mouvementChartConfig = {
    entrees: { label: "Entrées", color: "var(--chart-1)" },
    sorties: { label: "Sorties", color: "var(--chart-5)" },
} satisfies ChartConfig

const PIE_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--chart-6)",
    "var(--primary)",
    "var(--muted-foreground)",
]

function generateMouvementChartData(
    mouvementsRecents: MouvementRow[],
    periode: number
): Array<{ jour: string; entrees: number; sorties: number }> {
    const days: Array<{ jour: string; entrees: number; sorties: number }> = []
    const now = new Date()

    for (let i = periode - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        const label = `J-${i}`
        days.push({ jour: label, entrees: 0, sorties: 0 })

        for (const m of mouvementsRecents) {
            if (m.date.startsWith(key)) {
                const last = days[days.length - 1]
                if (m.type === "ENTREE") last.entrees += m.quantite
                else if (m.type === "SORTIE") last.sorties += m.quantite
            }
        }
    }

    return days
}

const alertColumns: ColumnDef<AlertRow>[] = [
    {
        accessorKey: "code",
        header: "Code",
        cell: ({ getValue }) => (
            <span className="text-xs font-mono">{getValue() as string}</span>
        ),
    },
    {
        accessorKey: "nom",
        header: "Produit",
        cell: ({ row }) => (
            <Link
                href={`/produits/${row.original.id}`}
                className="text-xs font-medium hover:underline"
            >
                {row.original.nom}
            </Link>
        ),
    },
    {
        accessorKey: "categorie",
        header: "Catégorie",
        cell: ({ getValue }) => (
            <span className="text-xs text-muted-foreground">
                {(getValue() as string | null) ?? "—"}
            </span>
        ),
    },
    {
        accessorKey: "stockActuel",
        header: () => <div className="text-right">Stock Actuel</div>,
        cell: ({ getValue }) => (
            <span className="text-xs text-right font-mono text-red-600">
                {getValue() as number}
            </span>
        ),
    },
    {
        accessorKey: "stockMinimum",
        header: () => <div className="text-right">Min.</div>,
        cell: ({ getValue }) => (
            <span className="text-xs text-right font-mono">
                {getValue() as number}
            </span>
        ),
    },
    {
        accessorKey: "stockStatus",
        header: "Statut",
        cell: ({ getValue }) => (
            <StockStatusBadge status={(getValue() as string) as StockStatus} />
        ),
    },
    {
        id: "action",
        header: "",
        cell: ({ row }) => (
            <Link
                href={`/produits/${row.original.id}`}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                Voir
            </Link>
        ),
    },
]

const topProduitsColumns: ColumnDef<TopProduitRow>[] = [
    {
        accessorKey: "code",
        header: "Code",
        cell: ({ getValue }) => (
            <span className="text-xs font-mono">{getValue() as string}</span>
        ),
    },
    {
        accessorKey: "nom",
        header: "Produit",
        cell: ({ row }) => (
            <Link
                href={`/produits/${row.original.id}`}
                className="text-xs font-medium hover:underline"
            >
                {row.original.nom}
            </Link>
        ),
    },
    {
        accessorKey: "categorie",
        header: "Catégorie",
        cell: ({ getValue }) => (
            <span className="text-xs text-muted-foreground">
                {(getValue() as string | null) ?? "—"}
            </span>
        ),
    },
    {
        id: "stock",
        header: () => <div className="text-right">Stock</div>,
        cell: ({ row }) => (
            <span className="text-xs text-right font-mono">
                {row.original.stockActuel}
                <span className="text-muted-foreground ml-0.5">
                    /{row.original.stockMinimum}
                </span>
            </span>
        ),
    },
    {
        accessorKey: "valeur",
        header: () => <div className="text-right">Valeur</div>,
        cell: ({ getValue }) => (
            <span className="text-xs text-right font-mono">
                {formatTND(String(getValue() as number))}
            </span>
        ),
    },
    {
        accessorKey: "stockStatus",
        header: "Statut",
        cell: ({ getValue }) => (
            <StockStatusBadge status={(getValue() as string) as StockStatus} />
        ),
    },
]

const categorieColumns: ColumnDef<CategorieRow>[] = [
    {
        accessorKey: "nom",
        header: "Catégorie",
        cell: ({ getValue }) => (
            <span className="text-xs font-medium">{getValue() as string}</span>
        ),
    },
    {
        accessorKey: "count",
        header: () => <div className="text-right">Produits</div>,
        cell: ({ getValue }) => (
            <span className="text-xs text-right">{getValue() as number}</span>
        ),
    },
    {
        accessorKey: "valeur",
        header: () => <div className="text-right">Valeur</div>,
        cell: ({ getValue }) => (
            <span className="text-xs text-right font-mono">
                {formatTND(getValue() as string)}
            </span>
        ),
    },
]

const mouvementColumns: ColumnDef<MouvementRow>[] = [
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ getValue }) => {
            const date = getValue() as string
            return (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(date).toLocaleDateString("fr-TN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    })}
                </span>
            )
        },
    },
    {
        id: "produit",
        accessorFn: (row) => row.product?.nom ?? "",
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
        header: () => <div className="text-right">Qté</div>,
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
]

const mouvementTypeFilter: FacetedFilterDef = {
    columnId: "type",
    title: "Type",
    options: [
        { value: "ENTREE", label: "Entrées", icon: ArrowUpRight },
        { value: "SORTIE", label: "Sorties", icon: TrendingDown },
        { value: "AJUSTEMENT", label: "Ajustements", icon: RotateCcw },
    ],
}

function InventaireSkeleton() {
    return (
        <div className="flex-1 p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton className="h-72 rounded-xl" />
                <Skeleton className="h-72 rounded-xl" />
            </div>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
        </div>
    )
}

export function InventaireClient() {
    const { data, isLoading } = useInventaire("30")

    const [alertSearch, setAlertSearch] = useState("")
    const [topSearch, setTopSearch] = useState("")
    const [mouvementSearch, setMouvementSearch] = useState("")

    if (isLoading) return <InventaireSkeleton />
    if (!data) return null

    const { stats, categories, topProduits, produitsAlerte, mouvementsRecents } = data

    const chartData = generateMouvementChartData(mouvementsRecents, stats.periode)

    return (
        <div className="flex-1 p-4 space-y-4">
            {/* Section 1 — Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                    title="Total Produits"
                    value={String(stats.totalProduits)}
                    subtitle="Références actives"
                    icon={Package}
                />
                <StatCard
                    title="Valeur du Stock"
                    value={formatTND(stats.valeurStock)}
                    subtitle="Prix de revient HT"
                    icon={BarChart3}
                />
                <StatCard
                    title="Alertes"
                    value={String(stats.alertesCount)}
                    subtitle={stats.alertesCount > 0 ? "Stock critique" : "Aucune alerte"}
                    subtitleVariant={stats.alertesCount > 0 ? "danger" : "default"}
                    icon={AlertTriangle}
                />
                <StatCard
                    title="Ruptures"
                    value={String(stats.rupturesCount)}
                    subtitle={stats.rupturesCount > 0 ? "Stock épuisé" : "Aucune rupture"}
                    subtitleVariant={stats.rupturesCount > 0 ? "danger" : "default"}
                    icon={TrendingDown}
                />
            </div>

            {/* Section 2 — Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="@container/card">
                    <CardHeader>
                        <CardTitle>Entrées vs Sorties</CardTitle>
                        <CardDescription>
                            <span className="hidden @[540px]/card:block">
                                Mouvements sur {stats.periode} jours
                            </span>
                            <span className="@[540px]/card:hidden">
                                {stats.periode} jours
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                        <ChartContainer
                            config={mouvementChartConfig}
                            className="aspect-auto h-[250px] w-full"
                        >
                            <BarChart data={chartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="jour"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    className="fill-muted-foreground text-xs"
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    className="fill-muted-foreground text-xs"
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent />}
                                />
                                <Bar
                                    dataKey="entrees"
                                    fill="var(--color-entrees)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="sorties"
                                    fill="var(--color-sorties)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="@container/card">
                    <CardHeader>
                        <CardTitle>Répartition par Catégorie</CardTitle>
                        <CardDescription>
                            <span className="hidden @[540px]/card:block">
                                Distribution des produits
                            </span>
                            <span className="@[540px]/card:hidden">Catégories</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                        {categories.length === 0 ? (
                            <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
                                Aucune catégorie
                            </div>
                        ) : (
                            <ChartContainer
                                config={Object.fromEntries(
                                    categories.map((c, i) => [
                                        c.nom,
                                        {
                                            label: c.nom,
                                            color: PIE_COLORS[i % PIE_COLORS.length],
                                        },
                                    ])
                                )}
                                className="aspect-auto h-[250px] w-full"
                            >
                                <PieChart>
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value) =>
                                                    `${value} produit${Number(value) > 1 ? "s" : ""}`
                                                }
                                            />
                                        }
                                    />
                                    <Pie
                                        data={categories}
                                        dataKey="count"
                                        nameKey="nom"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        strokeWidth={2}
                                        stroke="var(--background)"
                                    >
                                        {categories.map((_, i) => (
                                            <Cell
                                                key={i}
                                                fill={PIE_COLORS[i % PIE_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Section 3 — Produits en Alertes */}
            {produitsAlerte.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-600">
                            <AlertTriangle className="size-4" />
                            Produits en Alerte
                        </CardTitle>
                        <CardDescription>
                            Ces produits nécessitent un réapprovisionnement
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={alertColumns}
                            data={produitsAlerte as AlertRow[]}
                            searchValue={alertSearch}
                            onSearchChange={setAlertSearch}
                            searchPlaceholder="Rechercher un produit..."
                            enableColumnVisibility
                            emptyMessage="Aucun produit en alerte"
                        />
                    </CardContent>
                </Card>
            )}

            {/* Section 4 — Top Produits par Valeur */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Produits par Valeur</CardTitle>
                    <CardDescription>
                        Produits avec la plus grande valeur de stock
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={topProduitsColumns}
                        data={topProduits as TopProduitRow[]}
                        searchValue={topSearch}
                        onSearchChange={setTopSearch}
                        searchPlaceholder="Rechercher un produit..."
                        enableColumnVisibility
                        emptyMessage="Aucun produit"
                    />
                </CardContent>
            </Card>

            {/* Section 5 — Répartition par Catégorie */}
            <Card>
                <CardHeader>
                    <CardTitle>Répartition par Catégorie</CardTitle>
                    <CardDescription>Nombre de produits et valeur par catégorie</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={categorieColumns}
                        data={categories as CategorieRow[]}
                        emptyMessage="Aucune catégorie"
                    />
                </CardContent>
            </Card>

            {/* Section 6 — Mouvements Récents */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RotateCcw className="size-4 text-muted-foreground" />
                        Mouvements Récents
                    </CardTitle>
                    <CardDescription>Derniers mouvements de stock</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={mouvementColumns}
                        data={mouvementsRecents as MouvementRow[]}
                        searchValue={mouvementSearch}
                        onSearchChange={setMouvementSearch}
                        searchPlaceholder="Rechercher un produit..."
                        facetedFilters={[mouvementTypeFilter]}
                        enableColumnVisibility
                        pageSize={10}
                        pageSizeOptions={[10, 20, 50]}
                        emptyMessage="Aucun mouvement récent"
                    />
                </CardContent>
            </Card>
        </div>
    )
}
