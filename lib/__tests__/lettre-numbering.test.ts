import { describe, it, expect } from "vitest"
import { numInWords, sousCent, sousMille } from "@/components/effets/lettre/num-in-words"

describe("sousCent", () => {
    it("retourne une chaîne vide pour 0", () => {
        expect(sousCent(0)).toBe("")
    })

    it("gère les unités seules", () => {
        expect(sousCent(1)).toBe("un")
        expect(sousCent(5)).toBe("cinq")
        expect(sousCent(9)).toBe("neuf")
    })

    it("gère les deux petits nombres de la teens", () => {
        expect(sousCent(10)).toBe("dix")
        expect(sousCent(11)).toBe("onze")
        expect(sousCent(16)).toBe("seize")
        expect(sousCent(19)).toBe("dix-neuf")
    })

    it("gère les dizaines simples", () => {
        expect(sousCent(20)).toBe("vingt")
        expect(sousCent(21)).toBe("vingt-un")
        expect(sousCent(32)).toBe("trente-deux")
        expect(sousCent(60)).toBe("soixante")
    })

    it("gère soixante-dix (70-79) avec la règle 70 + unité 10-19", () => {
        expect(sousCent(70)).toBe("soixante-dix")
        expect(sousCent(71)).toBe("soixante-onze")
        expect(sousCent(72)).toBe("soixante-douze")
        expect(sousCent(77)).toBe("soixante-dix-sept")
        expect(sousCent(79)).toBe("soixante-dix-neuf")
    })

    it("gère quatre-vingt (80-89)", () => {
        expect(sousCent(80)).toBe("quatre-vingt")
        expect(sousCent(81)).toBe("quatre-vingt-un")
        expect(sousCent(88)).toBe("quatre-vingt-huit")
    })

    it("gère quatre-vingt-dix (90-99) avec la règle 90 + unité 10-19", () => {
        expect(sousCent(90)).toBe("quatre-vingt-dix")
        expect(sousCent(91)).toBe("quatre-vingt-onze")
        expect(sousCent(99)).toBe("quatre-vingt-dix-neuf")
    })
})

describe("sousMille", () => {
    it("retourne une chaîne vide pour 0", () => {
        expect(sousMille(0)).toBe("")
    })

    it("délègue à sousCent sous 100", () => {
        expect(sousMille(7)).toBe("sept")
        expect(sousMille(16)).toBe("seize")
        expect(sousMille(71)).toBe("soixante-onze")
    })

    it("gère les centaines", () => {
        expect(sousMille(100)).toBe("cent")
        expect(sousMille(101)).toBe("cent un")
        expect(sousMille(200)).toBe("deux cent")
        expect(sousMille(234)).toBe("deux cent trente-quatre")
        expect(sousMille(700)).toBe("sept cent")
    })

    it("gère le maximum sous 1000", () => {
        expect(sousMille(999)).toBe("neuf cent quatre-vingt-dix-neuf")
    })
})

describe("numInWords", () => {
    it("retourne « zéro » (minuscule) pour 0 — early return avant le toUpperCase()", () => {
        expect(numInWords(0)).toBe("zéro")
    })

    it("gère les petites valeurs en majuscules", () => {
        expect(numInWords(1)).toBe("UN")
        expect(numInWords(10)).toBe("DIX")
        expect(numInWords(16)).toBe("SEIZE")
        expect(numInWords(21)).toBe("VINGT-UN")
        expect(numInWords(80)).toBe("QUATRE-VINGT")
        expect(numInWords(91)).toBe("QUATRE-VINGT-ONZE")
        expect(numInWords(100)).toBe("CENT")
    })

    it("gère les milliers", () => {
        expect(numInWords(1000)).toBe("MILLE")
        expect(numInWords(1234)).toBe("MILLE DEUX CENT TRENTE-QUATRE")
        expect(numInWords(2000)).toBe("DEUX MILLE")
        expect(numInWords(10000)).toBe("DIX MILLE")
        expect(numInWords(100000)).toBe("CENT MILLE")
        expect(numInWords(500000)).toBe("CINQ CENT MILLE")
    })

    it("gère les millions (règle implémentée : pas de « s » au pluriel)", () => {
        expect(numInWords(1000000)).toBe("UN MILLION")
        expect(numInWords(2000000)).toBe("DEUX MILLION")
        expect(numInWords(1500000)).toBe("UN MILLION CINQ CENT MILLE")
        expect(numInWords(2500000)).toBe("DEUX MILLION CINQ CENT MILLE")
    })

    it("gère un grand montant tunisien combiné", () => {
        expect(numInWords(1234567)).toBe("UN MILLION DEUX CENT TRENTE-QUATRE MILLE CINQ CENT SOIXANTE-SEPT")
    })
})
