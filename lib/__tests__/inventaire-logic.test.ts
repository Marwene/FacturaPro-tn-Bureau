import { describe, it, expect } from "vitest"
import { generateMouvementChartData } from "@/lib/inventaire-logic"

const now = new Date("2026-10-25T12:00:00.000Z")

function m(date: string, type: string, quantite: number) {
    return { date, type, quantite }
}

describe("generateMouvementChartData", () => {
    it("retourne exactement une bucket par jour de période, du plus ancien à J-0", () => {
        const rows = generateMouvementChartData([], 7, now)

        expect(rows).toHaveLength(7)
        expect(rows.map((r) => r.jour)).toEqual(["J-6", "J-5", "J-4", "J-3", "J-2", "J-1", "J-0"])
        expect(rows.every((r) => r.entrees === 0 && r.sorties === 0)).toBe(true)
    })

    it("additionne entrées et sorties du même jour ISO", () => {
        const rows = generateMouvementChartData(
            [
                m("2026-10-25T08:00:00.000Z", "ENTREE", 3),
                m("2026-10-25T17:00:00.000Z", "ENTREE", 4),
                m("2026-10-24T09:00:00.000Z", "SORTIE", 2),
                m("2026-10-24T11:00:00.000Z", "ENTREE", 5),
            ],
            7,
            now
        )

        const today = rows[rows.length - 1]
        expect(today.entrees).toBe(7)
        expect(today.sorties).toBe(0)

        const yesterday = rows[rows.length - 2]
        expect(yesterday.entrees).toBe(5)
        expect(yesterday.sorties).toBe(2)
    })

    it("ignore les AJUSTEMENTS et les mouvements hors période", () => {
        const rows = generateMouvementChartData(
            [
                m("2026-10-25T08:00:00.000Z", "AJUSTEMENT", 9),
                m("2026-10-01T08:00:00.000Z", "ENTREE", 10),
                m("2026-10-20T08:00:00.000Z", "SORTIE", 1),
            ],
            7,
            now
        )

        expect(rows.every((r) => r.entrees === 0)).toBe(true)
        expect(rows[rows.length - 1].sorties).toBe(0)

        const j5 = rows.find((r) => r.jour === "J-5")
        expect(j5?.sorties).toBe(1)
    })

    it("gère une période de 1 jour sans planter", () => {
        const rows = generateMouvementChartData([m("2026-10-25T08:00:00.000Z", "SORTIE", 4)], 1, now)

        expect(rows).toHaveLength(1)
        expect(rows[0]).toEqual({ jour: "J-0", entrees: 0, sorties: 4 })
    })
})
