"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { StockStatusBadge } from "@/components/status-badge"
import type { StockStatus } from "@/lib/types"
import type { InventaireData } from "@/hooks/use-inventaire"
import { formatTND } from "@/lib/decimal"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

type AlertRow = InventaireData["produitsAlerte"][number]
type TopProduitRow = InventaireData["topProduits"][number]
type CategorieRow = InventaireData["categories"][number]

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
        cell: ({ getValue }) => <span className="text-xs text-right font-mono">{getValue() as number}</span>,
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
        cell: ({ getValue }) => <span className="text-xs text-right">{getValue() as number}</span>,
    },
    {
        accessorKey: "valeur",
        header: () => <div className="text-right">Valeur</div>,
        cell: ({ getValue }) => (
            <span className="text-xs text-right font-mono">{formatTND(getValue() as string)}</span>
        ),
    },
]

interface TableSearchProps {
    search: string
    onSearchChange: (value: string) => void
}

export function InventaireAlertsSection({
    produits,
    search,
    onSearchChange,
}: TableSearchProps & { produits: AlertRow[] }) {
    return (
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
                    data={produits}
                    searchValue={search}
                    onSearchChange={onSearchChange}
                    searchPlaceholder="Rechercher un produit..."
                    enableColumnVisibility
                    emptyMessage="Aucun produit en alerte"
                />
            </CardContent>
        </Card>
    )
}

export function InventaireTopSection({
    produits,
    search,
    onSearchChange,
}: TableSearchProps & { produits: TopProduitRow[] }) {
    return (
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
                    data={produits}
                    searchValue={search}
                    onSearchChange={onSearchChange}
                    searchPlaceholder="Rechercher un produit..."
                    enableColumnVisibility
                    emptyMessage="Aucun produit"
                />
            </CardContent>
        </Card>
    )
}

export function InventaireCategoriesSection({ categories }: { categories: CategorieRow[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Répartition par Catégorie</CardTitle>
                <CardDescription>Nombre de produits et valeur par catégorie</CardDescription>
            </CardHeader>
            <CardContent>
                <DataTable
                    columns={categorieColumns}
                    data={categories}
                    emptyMessage="Aucune catégorie"
                />
            </CardContent>
        </Card>
    )
}
