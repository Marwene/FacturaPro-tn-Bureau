"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { StatCard } from "@/components/stat-card"
import { StockStatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatTND } from "@/lib/decimal"
import { AlertTriangle, TrendingDown, RotateCcw } from "lucide-react"
import { useRapportInventaire } from "@/hooks/use-rapport-inventaire"

export function RapportInventaire() {
    const [periode, setPeriode] = useState("30")

    const { data, isLoading } = useRapportInventaire(periode)

    if (isLoading) {
        return (
            <div className="flex-1 p-3 md:p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-lg" />
                    ))}
                </div>
                <Skeleton className="h-64 rounded-lg" />
            </div>
        )
    }

    if (!data) return null

    const { stats } = data

    return (
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {/* Period selector */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Période :</span>
                <Select value={periode} onValueChange={setPeriode}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7" className="text-xs">7 jours</SelectItem>
                        <SelectItem value="30" className="text-xs">30 jours</SelectItem>
                        <SelectItem value="90" className="text-xs">90 jours</SelectItem>
                        <SelectItem value="365" className="text-xs">1 an</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard title="Total Produits" value={String(stats.totalProduits)} subtitle="Références" />
                <StatCard title="Valeur du Stock" value={formatTND(stats.valeurStock)} subtitle="Prix de revient HT" />
                <StatCard title="Alertes" value={String(stats.alertesCount)} subtitle="Stock critique" subtitleVariant={stats.alertesCount > 0 ? "danger" : "default"} />
                <StatCard title="Ruptures" value={String(stats.rupturesCount)} subtitle="Stock épuisé" subtitleVariant={stats.rupturesCount > 0 ? "danger" : "default"} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard title="Entrées" value={String(stats.mouvementsEntree)} subtitle={`Sur ${stats.periode} jours`} />
                <StatCard title="Sorties" value={String(stats.mouvementsSortie)} subtitle={`Sur ${stats.periode} jours`} />
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Alertes */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-4 text-orange-500" />
                            Produits en alerte
                        </CardTitle>
                        <CardDescription>Stock critique — {stats.alertesCount} produit(s)</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-64">
                            {data.alertes.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs">Produit</TableHead>
                                            <TableHead className="text-xs text-right">Stock</TableHead>
                                            <TableHead className="text-xs text-right">Min.</TableHead>
                                            <TableHead className="text-xs">Statut</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.alertes.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="text-xs">{p.nom}</TableCell>
                                                <TableCell className="text-xs text-right">{p.stockActuel}</TableCell>
                                                <TableCell className="text-xs text-right">{p.stockMinimum}</TableCell>
                                                <TableCell><StockStatusBadge status={p.stockStatus} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-xs text-muted-foreground text-center py-8">Aucune alerte</div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Ruptures */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="size-4 text-red-500" />
                            Produits en rupture
                        </CardTitle>
                        <CardDescription>Stock épuisé — {stats.rupturesCount} produit(s)</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-64">
                            {data.ruptures.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-xs">Produit</TableHead>
                                            <TableHead className="text-xs text-right">Stock</TableHead>
                                            <TableHead className="text-xs">Statut</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.ruptures.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="text-xs">{p.nom}</TableCell>
                                                <TableCell className="text-xs text-right">{p.stockActuel}</TableCell>
                                                <TableCell><StockStatusBadge status={p.stockStatus} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-xs text-muted-foreground text-center py-8">Aucune rupture</div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* Mouvements récents */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <RotateCcw className="size-4" />
                        Mouvements de stock
                    </CardTitle>
                    <CardDescription>Derniers mouvements ({stats.periode} jours)</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-72">
                        {data.mouvements.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Date</TableHead>
                                        <TableHead className="text-xs">Produit</TableHead>
                                        <TableHead className="text-xs">Type</TableHead>
                                        <TableHead className="text-xs text-right">Quantité</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.mouvements.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs">{new Date(m.createdAt).toLocaleDateString("fr-TN")}</TableCell>
                                            <TableCell className="text-xs">{m.product.nom}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] ${m.type === "ENTREE" ? "text-emerald-600 border-emerald-300" : "text-red-600 border-red-300"}`}>
                                                    {m.type === "ENTREE" ? "Entrée" : "Sortie"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-right font-medium">
                                                <span className={m.type === "ENTREE" ? "text-emerald-600" : "text-red-600"}>
                                                    {m.type === "ENTREE" ? "+" : "-"}{m.quantite}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-xs text-muted-foreground text-center py-8">Aucun mouvement</div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
