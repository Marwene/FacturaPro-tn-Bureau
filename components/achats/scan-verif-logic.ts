import { parseTunisianNumber } from "@/lib/decimal"
import type { AchatFormState, AchatLineForm, ExtractedData } from "@/lib/stores/achats-store"
import type { AchatCategorie, AchatType } from "@/lib/types"

export type ScanAchatFormValues = Pick<
  AchatFormState,
  | "tiersId"
  | "createFournisseur"
  | "type"
  | "dateFacture"
  | "dateEcheance"
  | "referenceFournisseur"
  | "timbreFiscal"
  | "totalHT"
  | "totalTVA"
  | "totalTTC"
  | "notes"
  | "categorieAchat"
  | "blAchatId"
  | "lines"
>

export interface ScanAchatValidationError {
  title: string
  error: string
}

export type AchatScanCreatePayload = {
  type: AchatType
  tiersId: string
  createFournisseur: boolean
  fournisseur: ExtractedData["fournisseur"] | undefined
  dateFacture: string
  dateEcheance: string | null
  referenceFournisseur: string | null
  timbreFiscal: number
  totalHT: number | undefined
  totalTVA: number | undefined
  totalTTC: number | undefined
  notes: string | null
  categorieAchat: AchatCategorie | null
  blAchatId: string | null
  asDraft: false
  lines: {
    productId: string | null
    createProduct: boolean
    description: string
    quantite: number
    prixAchat: number
    remise: number
    tauxTVA: number
  }[]
}

export function validateScanAchatForm(
  form: Pick<ScanAchatFormValues, "tiersId" | "createFournisseur" | "lines">,
  extracted: ExtractedData | null,
): ScanAchatValidationError | null {
  if (!form.tiersId && !(form.createFournisseur && extracted?.fournisseur?.raisonSociale)) {
    return { title: "Fournisseur requis", error: "Sélectionnez un fournisseur pour continuer." }
  }
  if (form.lines.length === 0 || form.lines.every((l) => !l.description)) {
    return { title: "Ligne d'achat requise", error: "Ajoutez au moins une ligne d'achat." }
  }
  return null
}

export function buildAchatScanPayload(
  form: ScanAchatFormValues,
  extracted: ExtractedData | null,
): AchatScanCreatePayload {
  return {
    type: form.type,
    tiersId: form.tiersId,
    createFournisseur: form.createFournisseur,
    fournisseur: extracted?.fournisseur?.raisonSociale ? extracted.fournisseur : undefined,
    dateFacture: form.dateFacture,
    dateEcheance: form.dateEcheance || null,
    referenceFournisseur: form.referenceFournisseur || null,
    timbreFiscal: parseTunisianNumber(form.timbreFiscal) || 0,
    totalHT: form.totalHT ? parseTunisianNumber(form.totalHT) : undefined,
    totalTVA: form.totalTVA ? parseTunisianNumber(form.totalTVA) : undefined,
    totalTTC: form.totalTTC ? parseTunisianNumber(form.totalTTC) : undefined,
    notes: form.notes || null,
    categorieAchat: form.categorieAchat,
    blAchatId: form.blAchatId || null,
    asDraft: false,
    lines: form.lines.map((l) => ({
      productId: l.productId || null,
      createProduct: l.createProduct,
      description: l.description,
      quantite: parseTunisianNumber(l.quantite) || 1,
      prixAchat: parseTunisianNumber(l.prixAchat) || 0,
      remise: parseTunisianNumber(l.remise) || 0,
      tauxTVA: parseTunisianNumber(l.tauxTVA) || 19,
    })),
  }
}

export interface ScanMatchableProduct {
  id: string
  nom: string
  prixAchat: string
}

export function resolveProductSelection(
  products: readonly ScanMatchableProduct[],
  lines: readonly AchatLineForm[],
  lineId: string,
  productId: string,
): Partial<AchatLineForm> | null {
  if (productId === "none") return null
  const product = products.find((p) => p.id === productId)
  if (!product) return null
  const currentLine = lines.find((l) => l.id === lineId)
  return {
    productId: product.id,
    description: currentLine?.description || product.nom,
    prixAchat: currentLine?.prixAchat || product.prixAchat,
  }
}
