export type InventaireMouvementInput = {
    type: string
    quantite: number
    date: string
}

export type MouvementJour = { jour: string; entrees: number; sorties: number }

export function generateMouvementChartData(
    mouvementsRecents: InventaireMouvementInput[],
    periode: number,
    now: Date = new Date()
): MouvementJour[] {
    const days: MouvementJour[] = []

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
