import { describe, expect, it } from "vitest"
import type { AchatLineForm, ExtractedData } from "@/lib/stores/achats-store"
import {
  buildAchatScanPayload,
  resolveProductSelection,
  validateScanAchatForm,
  type ScanAchatFormValues,
} from "../scan-verif-logic"

function makeLine(overrides: Partial<AchatLineForm> = {}): AchatLineForm {
  return {
    id: "line-1",
    productId: null,
    createProduct: true,
    description: "",
    quantite: "1",
    prixAchat: "0",
    remise: "0",
    tauxTVA: "19",
    totalHT: "0",
    ...overrides,
  }
}

function makeExtracted(overrides: Partial<ExtractedData> = {}): ExtractedData {
  return {
    fournisseur: {
      raisonSociale: "Fournisseur Test",
      matriculeFiscal: null,
      adresse: null,
      ville: null,
      telephone: null,
      email: null,
    },
    referenceFournisseur: "REF-1",
    dateFacture: null,
    dateEcheance: null,
    timbreFiscal: null,
    notes: null,
    lines: [],
    totalHT: null,
    totalTVA: null,
    totalTTC: null,
    ...overrides,
  }
}

function makeForm(overrides: Partial<ScanAchatFormValues> = {}): ScanAchatFormValues {
  return {
    tiersId: "tiers-1",
    createFournisseur: true,
    type: "FACTURE",
    dateFacture: "2026-01-05",
    dateEcheance: "",
    referenceFournisseur: "",
    timbreFiscal: "0",
    totalHT: "",
    totalTVA: "",
    totalTTC: "",
    notes: "",
    categorieAchat: null,
    blAchatId: null,
    lines: [makeLine({ description: "Article" })],
    ...overrides,
  }
}

describe("validateScanAchatForm", () => {
  it("exige un fournisseur quand aucun n'est sélectionné ni créable", () => {
    const result = validateScanAchatForm(
      makeForm({ tiersId: "", createFournisseur: false }),
      null,
    )
    expect(result).toEqual({
      title: "Fournisseur requis",
      error: "Sélectionnez un fournisseur pour continuer.",
    })
  })

  it("accepte un fournisseur créé automatiquement depuis le scan", () => {
    const result = validateScanAchatForm(makeForm({ tiersId: "" }), makeExtracted())
    expect(result).toBeNull()
  })

  it("exige au moins une ligne avec une description", () => {
    expect(
      validateScanAchatForm(makeForm({ lines: [] }), makeExtracted()),
    ).toEqual({ title: "Ligne d'achat requise", error: "Ajoutez au moins une ligne d'achat." })
    expect(
      validateScanAchatForm(makeForm({ lines: [makeLine()] }), makeExtracted()),
    ).toEqual({ title: "Ligne d'achat requise", error: "Ajoutez au moins une ligne d'achat." })
  })
})

describe("buildAchatScanPayload", () => {
  it("applique les valeurs par défaut (TVA 19, qté 1, timbre 0, aucun BL)", () => {
    const payload = buildAchatScanPayload(
      makeForm({ lines: [makeLine({ description: "Article", quantite: "", prixAchat: "", remise: "", tauxTVA: "" })] }),
      makeExtracted(),
    )
    expect(payload.asDraft).toBe(false)
    expect(payload.timbreFiscal).toBe(0)
    expect(payload.blAchatId).toBeNull()
    expect(payload.dateEcheance).toBeNull()
    expect(payload.referenceFournisseur).toBeNull()
    expect(payload.notes).toBeNull()
    expect(payload.lines[0]).toEqual({
      productId: null,
      createProduct: true,
      description: "Article",
      quantite: 1,
      prixAchat: 0,
      remise: 0,
      tauxTVA: 19,
    })
  })

  it("passe le fournisseur extrait seulement s'il a une raison sociale", () => {
    const withExtracted = buildAchatScanPayload(makeForm({ tiersId: "" }), makeExtracted())
    expect(withExtracted.fournisseur?.raisonSociale).toBe("Fournisseur Test")

    const withoutRaison = buildAchatScanPayload(
      makeForm({ tiersId: "" }),
      makeExtracted({ fournisseur: { ...makeExtracted().fournisseur, raisonSociale: null } }),
    )
    expect(withoutRaison.fournisseur).toBeUndefined()

    const sansScan = buildAchatScanPayload(makeForm(), null)
    expect(sansScan.fournisseur).toBeUndefined()
  })

  it("convertit les montants saisis en virgule tunisienne", () => {
    const payload = buildAchatScanPayload(
      makeForm({
        totalHT: "1 234,567",
        totalTVA: "234,568",
        totalTTC: "1 469,135",
        timbreFiscal: "1,000",
      }),
      null,
    )
    expect(payload.totalHT).toBeCloseTo(1234.567)
    expect(payload.totalTVA).toBeCloseTo(234.568)
    expect(payload.totalTTC).toBeCloseTo(1469.135)
    expect(payload.timbreFiscal).toBe(1)
  })
})

describe("resolveProductSelection", () => {
  const products = [
    { id: "p-1", nom: "Ciment", prixAchat: "12,500" },
    { id: "p-2", nom: "Sable", prixAchat: "8" },
  ]

  it("ignore la sélection vide ou inconnue", () => {
    expect(resolveProductSelection(products, [makeLine()], "line-1", "none")).toBeNull()
    expect(resolveProductSelection(products, [makeLine()], "line-1", "p-999")).toBeNull()
  })

  it("comble description et prix d'achat depuis le produit quand la ligne est vide", () => {
    const line = makeLine({ prixAchat: "" })
    const updates = resolveProductSelection(products, [line], "line-1", "p-1")
    expect(updates).toEqual({ productId: "p-1", description: "Ciment", prixAchat: "12,500" })
  })

  it("conserve la description et le prix déjà saisis (y compris « 0 » par défaut)", () => {
    const defaultLine = resolveProductSelection(products, [makeLine()], "line-1", "p-1")
    expect(defaultLine).toEqual({ productId: "p-1", description: "Ciment", prixAchat: "0" })

    const line = makeLine({ description: "Ciment 50kg", prixAchat: "13,000" })
    const updates = resolveProductSelection(products, [line], "line-1", "p-1")
    expect(updates).toEqual({ productId: "p-1", description: "Ciment 50kg", prixAchat: "13,000" })
  })
})
