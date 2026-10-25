"use client"

import { useState } from "react"
import { useInventaire } from "@/hooks/use-inventaire"
import { generateMouvementChartData } from "@/lib/inventaire-logic"
import { InventaireSkeleton } from "./inventaire-skeleton"
import { InventaireKpis } from "./inventaire-kpis"
import { InventaireCharts } from "./inventaire-charts"
import {
    InventaireAlertsSection,
    InventaireCategoriesSection,
    InventaireTopSection,
} from "./inventaire-tables"
import { InventaireMouvementsSection } from "./inventaire-mouvements-section"

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
            <InventaireKpis stats={stats} />
            <InventaireCharts
                periode={stats.periode}
                categories={categories}
                chartData={chartData}
            />
            {produitsAlerte.length > 0 && (
                <InventaireAlertsSection
                    produits={produitsAlerte}
                    search={alertSearch}
                    onSearchChange={setAlertSearch}
                />
            )}
            <InventaireTopSection
                produits={topProduits}
                search={topSearch}
                onSearchChange={setTopSearch}
            />
            <InventaireCategoriesSection categories={categories} />
            <InventaireMouvementsSection
                mouvements={mouvementsRecents}
                search={mouvementSearch}
                onSearchChange={setMouvementSearch}
            />
        </div>
    )
}
