import { round3 } from "./effet-split-logic";
import type { SplitRow } from "./effet-split-logic";

export const horizons: { label: string; value: 30 | 60 | 90 | 120 | null }[] = [
    { label: "Tous", value: null },
    { label: "30 j", value: 30 },
    { label: "60 j", value: 60 },
    { label: "90 j", value: 90 },
    { label: "120 j", value: 120 },
]

export function sumRowAllocations(row: SplitRow): number {
    return row.allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.montant) || 0), 0)
}

export function formatMontantDT(montant: number): string {
    return `${round3(montant).toFixed(3)} DT`
}

export function echeanceJoursTone(jours: number): string {
    if (jours <= 3) return "text-red-600 font-semibold"
    if (jours <= 7) return "text-amber-600 font-medium"
    if (jours <= 15) return "text-sky-600 font-medium"
    return "text-emerald-600 font-medium"
}

export function echeanceJoursLabel(jours: number): string {
    return jours === 0 ? "Aujourd'hui" : `J-${jours}`
}
