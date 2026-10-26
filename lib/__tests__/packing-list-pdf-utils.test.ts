import { describe, it, expect } from "vitest"
import { agregerParTaille, sortTailles, fmtDate } from "@/lib/packing-list/pdf-shared"

describe("agregerParTaille", () => {
    it("additionne les quantités des doublons de tailles", () => {
        const map = agregerParTaille([
            { taille: "M", quantite: 3 },
            { taille: "L", quantite: 2 },
            { taille: "M", quantite: 4 },
        ])

        expect(map).toEqual({ M: 7, L: 2 })
    })

    it("met les tailles vides sous la clé « Std »", () => {
        const map = agregerParTaille([
            { taille: "", quantite: 5 },
            { taille: "S", quantite: 1 },
        ])

        expect(map).toEqual({ Std: 5, S: 1 })
    })

    it("retourne un objet vide pour une liste vide", () => {
        expect(agregerParTaille([])).toEqual({})
    })
})

describe("sortTailles", () => {
    it("laisse un tableau déjà trié inchangé", () => {
        expect(sortTailles(["L", "M", "S"])).toEqual(["L", "M", "S"])
    })

    it("trie un tableau désordonné en ordre lexicographique français", () => {
        expect(sortTailles(["S", "L", "M"])).toEqual(["L", "M", "S"])
    })

    it("trie numériquement : 2 avant 10", () => {
        expect(sortTailles(["10", "2", "1"])).toEqual(["1", "2", "10"])
    })

    it("ne modifie pas le tableau d'origine", () => {
        const input = ["S", "L", "M"]
        sortTailles(input)

        expect(input).toEqual(["S", "L", "M"])
    })

    it("gère les doublons sans les supprimer", () => {
        expect(sortTailles(["M", "L", "M"])).toEqual(["L", "M", "M"])
    })
})

describe("fmtDate", () => {
    it("retourne « — » pour null, undefined ou une chaîne vide", () => {
        expect(fmtDate(null)).toBe("—")
        expect(fmtDate(undefined)).toBe("—")
        expect(fmtDate("")).toBe("—")
    })

    it("formate un objet Date en français", () => {
        expect(fmtDate(new Date(2026, 0, 15))).toBe("15/01/2026")
    })

    it("formate une chaîne ISO comme l'équivalent Date", () => {
        const iso = "2026-10-07T00:00:00.000Z"

        expect(fmtDate(iso)).toBe(fmtDate(new Date(iso)))
    })

    it("ne lève pas d'exception sur une chaîne illisible", () => {
        expect(() => fmtDate("pas-une-date")).not.toThrow()
    })
})
