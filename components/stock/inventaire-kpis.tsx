import { StatCard } from "@/components/stat-card"
import type { InventaireData } from "@/hooks/use-inventaire"
import { formatTND } from "@/lib/decimal"
import { Package, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react"

type InventaireStats = InventaireData["stats"]

export function InventaireKpis({ stats }: { stats: InventaireStats }) {
    return (
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
    )
}
