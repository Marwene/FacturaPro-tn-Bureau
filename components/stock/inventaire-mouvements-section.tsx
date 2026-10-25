"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import type { FacetedFilterDef } from "@/components/data-table/types"
import type { InventaireData } from "@/hooks/use-inventaire"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, TrendingDown, RotateCcw } from "lucide-react"
import Link from "next/link"

type MouvementRow = InventaireData["mouvementsRecents"][number]

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

export function InventaireMouvementsSection({
    mouvements,
    search,
    onSearchChange,
}: {
    mouvements: MouvementRow[]
    search: string
    onSearchChange: (value: string) => void
}) {
    return (
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
                    data={mouvements}
                    searchValue={search}
                    onSearchChange={onSearchChange}
                    searchPlaceholder="Rechercher un produit..."
                    facetedFilters={[mouvementTypeFilter]}
                    enableColumnVisibility
                    pageSize={10}
                    pageSizeOptions={[10, 20, 50]}
                    emptyMessage="Aucun mouvement récent"
                />
            </CardContent>
        </Card>
    )
}
