import { cn, formatDate } from "@/lib/utils"

interface DateCellProps {
    value: Date | string | null | undefined
    fallback?: string
    className?: string
}

/**
 * Cellule de date via la source unique `formatDate` (lib/utils.ts, fr-TN
 * jj/mm/aaaa). Les dates absentes rendent un fallback en muted-foreground
 * plutôt que 1970 ou une cellule vide.
 */
export function DateCell({ value, fallback = "—", className }: DateCellProps) {
    if (!value) {
        return <span className={cn("text-muted-foreground", className)}>{fallback}</span>
    }
    return <span className={cn("tabular-nums", className)}>{formatDate(value)}</span>
}
