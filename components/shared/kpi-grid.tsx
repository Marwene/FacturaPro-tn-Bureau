import { cn } from "@/lib/utils"

interface KpiGridProps {
    children: React.ReactNode
    columns?: 2 | 3 | 4
    className?: string
}

const columnClasses: Record<2 | 3 | 4, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
}

/**
 * Grille responsive de cartes KPI. Conteneur uniquement : les cartes restent
 * des `StatCard` (`components/stat-card.tsx`) passées comme enfants — ce
 * composant ne duplique ni n'enveloppe la logique de StatCard.
 */
export function KpiGrid({ children, columns = 4, className }: KpiGridProps) {
    return (
        <div className={cn("grid items-stretch gap-4", columnClasses[columns], className)}>
            {children}
        </div>
    )
}
