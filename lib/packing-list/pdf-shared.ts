import type { Carton } from "./colisage"

export interface PackingDetail {
  taille: string
  quantite: number
}

export interface PackingListPDFData {
  company: {
    nom: string
    adresse?: string | null
    ville?: string | null
    codePostal?: string | null
    telephone?: string | null
    email?: string | null
    matriculeFiscal?: string | null
    logo?: string | null
  }
  ordre: {
    code: string
    dateLivraison?: Date | string | null
  }
  tiers?: {
    raisonSociale: string
    adresse?: string | null
    ville?: string | null
    telephone?: string | null
    email?: string | null
  } | null
  produit: { nom: string; code: string }
  numero: string
  dateCreation: Date | string
  capaciteCarton: number
  details: PackingDetail[]
  cartons: Carton[]
  nbCartons: number
  totalPieces: number
  pdfUrl: string
}

export type EtiquetteFormat = "tsc200" | "a4"

export function agregerParTaille(details: PackingDetail[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const d of details) {
    const taille = d.taille || "Std"
    map[taille] = (map[taille] ?? 0) + d.quantite
  }
  return map
}

export function sortTailles(tailles: string[]): string[] {
  return [...tailles].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("fr-FR")
}

export const ACCENT: [number, number, number] = [77, 20, 140]
export const DARK: [number, number, number] = [30, 30, 30]
export const GRAY: [number, number, number] = [236, 236, 241]
export const LIGHT_GRAY: [number, number, number] = [245, 245, 245]

export const ETIQUETTE_W = 100
export const ETIQUETTE_H = 150

// A4 system printer: page 99.1×139 mm divided into 4 labels (2×2)
export const A4_LABEL_W = 99.1
export const A4_LABEL_H = 139
export const A4_COLS = 2
export const A4_ROWS = 2
export const A4_PAGE_W = 210
export const A4_PAGE_H = 297
export const A4_MARGIN = (A4_PAGE_W - A4_COLS * A4_LABEL_W) / 2
export const A4_TOP_MARGIN = 10
