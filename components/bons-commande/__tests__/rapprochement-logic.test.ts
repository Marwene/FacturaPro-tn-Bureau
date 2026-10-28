import { describe, expect, it } from "vitest"
import {
  computeEcart,
  formatDetailAttributes,
  formatEcart,
  formatQuantite3,
  summarizeRapprochement,
} from "../rapprochement-logic"
import type { SerializedBonCommandeLigneDetail, SerializedBonCommandeLine } from "@/lib/types"

function makeLigne(overrides: Partial<SerializedBonCommandeLine>): SerializedBonCommandeLine {
  return {
    id: "line-1",
    bonCommandeId: "bc-1",
    productId: null,
    description: "T-shirt coton",
    quantite: "10",
    prixHT: "0",
    remise: "0",
    tauxTVA: "19",
    fodec: false,
    tauxFodec: "1",
    totalHT: "0",
    ordre: 0,
    typeSource: "PRODUCTION",
    quantiteDetaillee: "10",
    statutRapprochement: "RECONCILIE",
    derniereVerification: null,
    ...overrides,
  }
}

function makeDetail(overrides: Partial<SerializedBonCommandeLigneDetail>): SerializedBonCommandeLigneDetail {
  return {
    id: "detail-1",
    bonCommandeLineId: "line-1",
    variantId: null,
    taille: null,
    couleur: null,
    broderie: null,
    impressionDtf: null,
    quantite: "1",
    sourceDocument: null,
    createdAt: new Date(0),
    ...overrides,
  }
}

// Référence : expressions inline historiques de rapprochement-card.tsx
// (avant extraction). Comparées bit à bit pour garantir un refactor strictement équivalent.
function legacyEcart(ligne: SerializedBonCommandeLine) {
  return Number(ligne.quantite) - Number(ligne.quantiteDetaillee)
}

function legacyDetailAttributes(d: SerializedBonCommandeLigneDetail) {
  return (
    [d.taille && `Taille: ${d.taille}`, d.couleur && `Couleur: ${d.couleur}`, d.broderie && `Broderie: ${d.broderie}`, d.impressionDtf && `DTF: ${d.impressionDtf}`]
      .filter(Boolean)
      .join(" · ") || "—"
  )
}

describe("computeEcart", () => {
  it("calcule quantité commandée moins quantité détaillée", () => {
    expect(computeEcart(makeLigne({ quantite: "12.5", quantiteDetaillee: "4.5" }))).toBe(8)
  })

  it("reste strictement équivalent à l'expression inline historique", () => {
    const lignes = [
      makeLigne({ quantite: "10", quantiteDetaillee: "10" }),
      makeLigne({ quantite: "7.250", quantiteDetaillee: "0" }),
      makeLigne({ quantite: "0", quantiteDetaillee: "3.5" }),
      makeLigne({ quantite: "abc", quantiteDetaillee: "1" }),
    ]
    for (const ligne of lignes) {
      expect(computeEcart(ligne)).toBe(legacyEcart(ligne))
    }
  })
})

describe("formatEcart", () => {
  it("préfixe les écarts positifs d'un plus", () => {
    expect(formatEcart(2.5)).toBe("+2.500")
  })

  it("formate les écarts nuls et négatifs sans plus", () => {
    expect(formatEcart(0)).toBe("0.000")
    expect(formatEcart(-1.25)).toBe("-1.250")
  })
})

describe("formatQuantite3", () => {
  it("arrondit toujours à 3 décimales", () => {
    expect(formatQuantite3("10")).toBe("10.000")
    expect(formatQuantite3(4.5)).toBe("4.500")
    expect(formatQuantite3("0.0005")).toBe("0.001")
  })
})

describe("formatDetailAttributes", () => {
  it("reste strictement équivalent à l'expression inline historique", () => {
    const details = [
      makeDetail({}),
      makeDetail({ taille: "M", couleur: "Rouge" }),
      makeDetail({ broderie: "Logo", impressionDtf: "Front" }),
      makeDetail({ taille: "", couleur: null, broderie: "X", impressionDtf: null }),
    ]
    for (const d of details) {
      expect(formatDetailAttributes(d)).toBe(legacyDetailAttributes(d))
    }
  })

  it("sépare les attributs présents par un point médian", () => {
    expect(formatDetailAttributes(makeDetail({ taille: "L", couleur: "Noir" }))).toBe("Taille: L · Couleur: Noir")
  })
})

describe("summarizeRapprochement", () => {
  it("n'filter pas les lignes d'un BC non mixte", () => {
    const lignes = [
      makeLigne({ id: "a", typeSource: "STOCK", statutRapprochement: "EN_ATTENTE_DETAIL" }),
      makeLigne({ id: "b", typeSource: "PRODUCTION" }),
    ]
    const view = summarizeRapprochement(lignes, false)
    expect(view.lignes).toHaveLength(2)
    expect(view.lignesProduction).toHaveLength(1)
  })

  it("n'affiche que les lignes PRODUCTION sur un BC mixte", () => {
    const lignes = [
      makeLigne({ id: "a", typeSource: "STOCK" }),
      makeLigne({ id: "b", typeSource: "PRODUCTION" }),
    ]
    const view = summarizeRapprochement(lignes, true)
    expect(view.lignes.map((l) => l.id)).toEqual(["b"])
    expect(view.lignesProduction.map((l) => l.id)).toEqual(["b"])
  })

  it("n'est honorable que si toutes les lignes production sont réconciliées", () => {
    const bloquantes = [
      makeLigne({ id: "a", typeSource: "STOCK", statutRapprochement: "EN_ATTENTE_DETAIL" }),
      makeLigne({ id: "b", typeSource: "PRODUCTION", statutRapprochement: "ECART_DETECTE" }),
    ]
    const view = summarizeRapprochement(bloquantes, false)
    expect(view.honorable).toBe(false)
    expect(view.lignesBloquantes.map((l) => l.id)).toEqual(["b"])

    const ok = summarizeRapprochement(
      [
        makeLigne({ id: "a", typeSource: "STOCK", statutRapprochement: "EN_ATTENTE_DETAIL" }),
        makeLigne({ id: "b", typeSource: "PRODUCTION", statutRapprochement: "RECONCILIE" }),
      ],
      false
    )
    expect(ok.honorable).toBe(true)
    expect(ok.lignesBloquantes).toHaveLength(0)
  })

  it("est honorable sur une liste vide", () => {
    expect(summarizeRapprochement([], false).honorable).toBe(true)
  })
})
