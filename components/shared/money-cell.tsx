import { formatTND } from "@/lib/decimal"
import { cn } from "@/lib/utils"

interface MoneyCellProps {
    value: string | number | null | undefined
    className?: string
}

/**
 * Cellule monétaire TND via la source unique `formatTND` (lib/decimal.ts).
 * `tabular-nums` par défaut pour éviter les décalages de mise en page sur des
 * valeurs qui se mettent à jour.
 */
export function MoneyCell({ value, className }: MoneyCellProps) {
    return <span className={cn("tabular-nums", className)}>{formatTND(value)}</span>
}
