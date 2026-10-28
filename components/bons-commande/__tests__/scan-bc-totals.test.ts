import { describe, expect, it } from "vitest"
import { parseTunisianNumber } from "@/lib/decimal"
import { computeBCLineTotals, computeBCTotals, type BCManualLine } from "../scan-bc-totals"

function makeLine(overrides: Partial<BCManualLine>): BCManualLine {
  return {
    id: "line-1",
    productId: null,
    createProduct: false,
    description: "",
    quantite: "1",
    prixHT: "0",
    remise: "0",
    tauxTVA: "0",
    fodec: false,
    tauxFodec: "0",
    totalHT: "0",
    typeSource: "STOCK",
    ...overrides,
  }
}

// Référence : algorithme en virgule flottante historique de scan-bc-manual-entry.tsx
// (avant extraction). Comparé bit à bit pour garantir un refactor strictement équivalent.
function legacyTotals(lines: BCManualLine[]) {
  let baseHT = 0
  let totalRemise = 0
  let totalTVA = 0
  let totalFodec = 0

  for (const line of lines) {
    const prix = parseTunisianNumber(line.prixHT) || 0
    const qte = parseTunisianNumber(line.quantite) || 0
    const remisePct = parseTunisianNumber(line.remise) || 0
    const tauxTVA = Number(line.tauxTVA) || 0
    const tauxFodec = Number(line.tauxFodec) || 1

    const lineHT = prix * qte
    const remiseAmount = lineHT * (remisePct / 100)
    const lineAfterRemise = lineHT - remiseAmount
    const lineTVA = lineAfterRemise * (tauxTVA / 100)
    const lineFodec = lineAfterRemise * (line.fodec ? tauxFodec / 100 : 0)

    baseHT += lineHT
    totalRemise += remiseAmount
    totalTVA += lineTVA
    totalFodec += lineFodec
  }

  const totalHT = baseHT - totalRemise
  const timbre = 1.000
  const totalTTC = totalHT + totalTVA + totalFodec + timbre

  return { baseHT, totalRemise, totalHT, totalTVA, totalFodec, totalTTC }
}

describe("computeBCLineTotals", () => {
  it("calcule HT, remise et total après remise", () => {
    const line = makeLine({ quantite: "2", prixHT: "100,5", remise: "10" })
    expect(computeBCLineTotals(line)).toEqual({
      lineHT: 201,
      remiseAmount: 20.1,
      totalHT: 180.9,
    })
  })

  it("retourne des zéros pour une ligne vide", () => {
    expect(computeBCLineTotals(makeLine({}))).toEqual({
      lineHT: 0,
      remiseAmount: 0,
      totalHT: 0,
    })
  })
})

describe("computeBCTotals", () => {
  it("retourne le timbre fiscal seul pour une liste vide", () => {
    expect(computeBCTotals([])).toEqual({
      baseHT: 0,
      totalRemise: 0,
      totalHT: 0,
      totalTVA: 0,
      totalFodec: 0,
      totalTTC: 1,
    })
  })

  it("applique le taux FODEC par défaut à 1 % quand tauxFodec est vide", () => {
    const lines = [makeLine({ quantite: "1", prixHT: "100", tauxTVA: "19", fodec: true, tauxFodec: "" })]
    expect(computeBCTotals(lines)).toMatchObject({
      baseHT: 100,
      totalHT: 100,
      totalTVA: 19,
      totalFodec: 1,
      totalTTC: 121,
    })
  })

  it("reste strictement équivalent à l'algorithme historique (arithmétique flottante)", () => {
    const lines = [
      makeLine({ id: "a", quantite: "3", prixHT: "125,750", remise: "5,5", tauxTVA: "19", fodec: true, tauxFodec: "0,5" }),
      makeLine({ id: "b", quantite: "10", prixHT: "9,999", remise: "0", tauxTVA: "7" }),
      makeLine({ id: "c", quantite: "0,5", prixHT: "220", remise: "12", tauxTVA: "13", fodec: true, tauxFodec: "" }),
      makeLine({ id: "d", quantite: "1", prixHT: "abc", remise: "", tauxTVA: "" }),
    ]
    expect(computeBCTotals(lines)).toEqual(legacyTotals(lines))
  })
})
