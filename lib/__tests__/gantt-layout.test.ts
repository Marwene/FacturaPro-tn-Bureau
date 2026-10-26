import { describe, it, expect } from "vitest"
import {
    ROW_HEIGHT,
    HEADER_HEIGHT,
    timeToMinutes,
    minutesToTime,
    minutesToX,
    computeTimeRange,
    computeHeaderMarkers,
    computeMinorLines,
    groupSlotsByRow,
    computeConflictIds,
    slotBounds,
    snapDragMinutes,
    type TimelineSlotData,
} from "@/lib/planning/gantt-layout"

function slot(id: string, rowId: string, startTime: string, duration: number): TimelineSlotData {
    return { id, rowId, startTime, duration, title: id }
}

describe("constantes de mise en page", () => {
    it("ROW_HEIGHT et HEADER_HEIGHT valent 56 et 44 px", () => {
        expect(ROW_HEIGHT).toBe(56)
        expect(HEADER_HEIGHT).toBe(44)
    })
})

describe("timeToMinutes", () => {
    it("convertit HH:MM en minutes depuis minuit", () => {
        expect(timeToMinutes("00:00")).toBe(0)
        expect(timeToMinutes("08:30")).toBe(510)
        expect(timeToMinutes("23:59")).toBe(1439)
    })
})

describe("minutesToTime", () => {
    it("convertit les minutes en HH:MM zero-paddé", () => {
        expect(minutesToTime(0)).toBe("00:00")
        expect(minutesToTime(510)).toBe("08:30")
        expect(minutesToTime(9 * 60 + 5)).toBe("09:05")
    })

    it("est l'opération inverse de timeToMinutes", () => {
        for (const minutes of [0, 45, 480, 510, 725, 1065, 1439]) {
            expect(timeToMinutes(minutesToTime(minutes))).toBe(minutes)
        }
    })
})

describe("minutesToX", () => {
    it("projette les bornes du range sur 0 et la largeur totale", () => {
        expect(minutesToX(480, 480, 600, 1400)).toBe(0)
        expect(minutesToX(1080, 480, 600, 1400)).toBe(1400)
        expect(minutesToX(780, 480, 600, 1400)).toBe(700)
    })

    it("produit une coordonnée négative avant le début du range", () => {
        expect(minutesToX(450, 480, 600, 1400)).toBe(-70)
    })

    it("gère un range sans offset de départ (vue semaine)", () => {
        expect(minutesToX(1440, 0, 7 * 24 * 60, 7 * 24 * 60)).toBe(1440)
    })
})

describe("computeTimeRange", () => {
    const today = new Date(2026, 9, 21, 14, 30)

    it("vue jour : start est aujourd'hui, range = heures ouvrées", () => {
        const range = computeTimeRange("day", today, 8, 18)
        expect(range.start).toBe(today)
        expect(range.totalMinutes).toBe(600)
    })

    it("vue semaine : start est le lundi de la semaine, range = 7 jours", () => {
        const range = computeTimeRange("week", today, 8, 18)
        expect(range.start.getDay()).toBe(1)
        expect(range.totalMinutes).toBe(7 * 24 * 60)

        const expectedMonday = new Date(today)
        const dow = today.getDay()
        expectedMonday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
        expect(range.start.getTime()).toBe(expectedMonday.getTime())
    })

    it("vue semaine : ne mutate pas la date d'entrée", () => {
        computeTimeRange("week", today, 8, 18)
        expect(today.getDate()).toBe(21)
        expect(today.getHours()).toBe(14)
    })

    it("vue mois : start est le 1er du mois, range = 28 jours", () => {
        const range = computeTimeRange("month", today, 8, 18)
        expect(range.start.getFullYear()).toBe(today.getFullYear())
        expect(range.start.getMonth()).toBe(today.getMonth())
        expect(range.start.getDate()).toBe(1)
        expect(range.totalMinutes).toBe(28 * 24 * 60)
    })
})

describe("computeHeaderMarkers", () => {
    const today = new Date(2026, 9, 21, 14, 30)

    it("vue jour : une marque par heure de 08h à 18h, alignées sur le range", () => {
        const range = computeTimeRange("day", today, 8, 18)
        const markers = computeHeaderMarkers("day", 8, 18, 480, range.totalMinutes, 1400, range)

        expect(markers).toHaveLength(11)
        expect(markers.map((m) => m.label)).toEqual([
            "08h", "09h", "10h", "11h", "12h", "13h", "14h", "15h", "16h", "17h", "18h",
        ])
        expect(markers.every((m) => m.isMajor)).toBe(true)
        expect(markers[0].left).toBe(0)
        expect(markers[10].left).toBe(1400)
    })

    it("vue semaine : 7 marques majeures, une par jour de lundi à dimanche", () => {
        const range = computeTimeRange("week", today, 8, 18)
        const markers = computeHeaderMarkers("week", 8, 18, 0, range.totalMinutes, 1400, range)

        expect(markers).toHaveLength(7)
        expect(markers.every((m) => m.isMajor)).toBe(true)
        expect(markers.map((m) => m.sublabel)).toHaveLength(7)

        const cursor = new Date(range.start)
        for (let i = 0; i < 7; i++) {
            expect(markers[i].sublabel).toBe(`${cursor.getDate()}`)
            expect(markers[i].label).toBe(cursor.toLocaleDateString("fr-FR", { weekday: "short" }))
            expect(markers[i].left).toBe(minutesToX(i * 24 * 60, 0, range.totalMinutes, 1400))
            cursor.setDate(cursor.getDate() + 1)
        }
    })

    it("vue mois : 28 marques, le 1er du mois et les lundis sont majeurs", () => {
        const range = computeTimeRange("month", today, 8, 18)
        const markers = computeHeaderMarkers("month", 8, 18, 0, range.totalMinutes, 1400, range)

        expect(markers).toHaveLength(28)
        expect(markers.map((m) => m.sublabel)).toEqual(
            Array.from({ length: 28 }, (_, i) => `${i + 1}`),
        )

        const cursor = new Date(range.start)
        for (let i = 0; i < 28; i++) {
            expect(markers[i].isMajor).toBe(cursor.getDate() === 1 || cursor.getDay() === 1)
            cursor.setDate(cursor.getDate() + 1)
        }
    })
})

describe("computeMinorLines", () => {
    it("vue jour : lignes toutes les 15 min hors heures pleines", () => {
        const lines = computeMinorLines("day", 8, 18, 15, 480, 600, 1400)

        expect(lines).toHaveLength(30)
        expect(lines[0]).toBe(minutesToX(495, 480, 600, 1400))
        expect(lines[lines.length - 1]).toBe(minutesToX(1065, 480, 600, 1400))
        const hourWidth = 60 / 600 * 1400
        expect(lines.every((x) => x % hourWidth !== 0)).toBe(true)
    })

    it("hors vue jour : aucune ligne secondaire", () => {
        expect(computeMinorLines("week", 8, 18, 15, 0, 7 * 24 * 60, 1400)).toEqual([])
        expect(computeMinorLines("month", 8, 18, 15, 0, 28 * 24 * 60, 1400)).toEqual([])
    })
})

describe("groupSlotsByRow", () => {
    it("groupe par rowId en conservant l'ordre d'entrée", () => {
        const grouped = groupSlotsByRow([
            slot("a", "atelier-1", "08:00", 60),
            slot("b", "atelier-2", "09:00", 30),
            slot("c", "atelier-1", "10:00", 45),
        ])

        expect(Object.keys(grouped)).toEqual(["atelier-1", "atelier-2"])
        expect(grouped["atelier-1"].map((s) => s.id)).toEqual(["a", "c"])
        expect(grouped["atelier-2"].map((s) => s.id)).toEqual(["b"])
    })

    it("retourne un objet vide sans slot", () => {
        expect(groupSlotsByRow([])).toEqual({})
    })
})

describe("computeConflictIds", () => {
    it("détecte deux slots qui se chevauchent sur une même ligne", () => {
        const ids = computeConflictIds([
            slot("a", "atelier-1", "08:00", 120),
            slot("b", "atelier-1", "09:00", 60),
        ])
        expect([...ids].sort()).toEqual(["a", "b"])
    })

    it("ignore deux slots qui se touchent exactement", () => {
        const ids = computeConflictIds([
            slot("a", "atelier-1", "08:00", 60),
            slot("b", "atelier-1", "09:00", 60),
        ])
        expect(ids.size).toBe(0)
    })

    it("ignore deux slots qui se chevauchent sur des lignes différentes", () => {
        const ids = computeConflictIds([
            slot("a", "atelier-1", "08:00", 120),
            slot("b", "atelier-2", "09:00", 60),
        ])
        expect(ids.size).toBe(0)
    })

    it("ne marque que les paires en conflit", () => {
        const ids = computeConflictIds([
            slot("a", "atelier-1", "08:00", 60),
            slot("b", "atelier-1", "08:30", 60),
            slot("c", "atelier-1", "14:00", 60),
            slot("d", "atelier-2", "08:30", 60),
        ])
        expect([...ids].sort()).toEqual(["a", "b"])
    })
})

describe("slotBounds", () => {
    it("calcule left et width à partir des minutes de début", () => {
        expect(slotBounds(480, 60, 480, 600, 1400)).toEqual({ left: 0, width: 140 })
        expect(slotBounds(495, 30, 480, 600, 1400)).toEqual({ left: 35, width: 70 })
    })

    it("une durée nulle donne une largeur nulle", () => {
        expect(slotBounds(600, 0, 480, 600, 1400)).toEqual({ left: 280, width: 0 })
    })
})

describe("snapDragMinutes", () => {
    it("arrondit la position glissée au pas de snap, offset en plus", () => {
        expect(snapDragMinutes(0, 600, 600, 15, 480)).toBe(480)
        expect(snapDragMinutes(7, 600, 600, 15, 480)).toBe(480)
        expect(snapDragMinutes(8, 600, 600, 15, 480)).toBe(495)
        expect(snapDragMinutes(22, 600, 600, 15, 480)).toBe(495)
        expect(snapDragMinutes(23, 600, 600, 15, 480)).toBe(510)
    })

    it("tient compte de la largeur réelle du conteneur", () => {
        // relMin = (140 / 1400) * 600 = 60 → pile sur un pas de 15
        expect(snapDragMinutes(140, 1400, 600, 15, 480)).toBe(540)
        // sans offset de départ (vue semaine)
        expect(snapDragMinutes(700, 1400, 600, 15, 0)).toBe(300)
    })
})
