import type { LucideIcon } from "lucide-react"
import { CheckCircle, Play } from "lucide-react"
import type { OFDetailLine } from "@/lib/types"

/**
 * Logique pure des ordres de fabrication — extraite de
 * `ordres-fabrication-client.tsx` (lot I « découpage des gros composants »,
 * limite 250 lignes). Aucun JSX ici : module testable (vitest) partagé par la
 * façade (filtre, dialog de changement de statut) et la ligne de liste.
 */

export const STATUTS = [
  { value: "", label: "Tous", color: "default" },
  { value: "BROUILLON", label: "Brouillon", color: "secondary" },
  { value: "CONFIRME", label: "Confirmé", color: "default" },
  { value: "EN_COURS", label: "En cours", color: "destructive" },
  { value: "TERMINE", label: "Terminé", color: "outline" },
  { value: "ANNULE", label: "Annulé", color: "outline" },
] as const

export const STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  CONFIRME: "Confirmé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
}

export type OfNextAction = { label: string; statut: string; icon: LucideIcon }

export const NEXT_STATUT: Record<string, OfNextAction | null> = {
  BROUILLON: { label: "Confirmer", statut: "CONFIRME", icon: CheckCircle },
  CONFIRME: { label: "Lancer", statut: "EN_COURS", icon: Play },
  EN_COURS: { label: "Terminer", statut: "TERMINE", icon: CheckCircle },
  TERMINE: null,
  ANNULE: null,
}

export function isOFDetail(v: unknown): v is OFDetailLine {
  return (
    typeof v === "object" &&
    v !== null &&
    "variantId" in v &&
    typeof v.variantId === "string" &&
    "variantNom" in v &&
    typeof v.variantNom === "string" &&
    "quantite" in v &&
    typeof v.quantite === "number" &&
    (!("taille" in v) || v.taille === undefined || typeof v.taille === "string") &&
    (!("couleur" in v) || v.couleur === undefined || typeof v.couleur === "string") &&
    (!("quantiteProduite" in v) || v.quantiteProduite === undefined || typeof v.quantiteProduite === "number")
  )
}

export function parseOFDetails(details: unknown): OFDetailLine[] | null {
  if (!Array.isArray(details)) return null
  const items: unknown[] = details
  const lines: OFDetailLine[] = []
  for (const item of items) {
    if (!isOFDetail(item)) return null
    lines.push(item)
  }
  return lines
}

export type OFDetailsMatrix = {
  tailles: string[]
  couleurs: string[]
  grid: Record<string, Record<string, OFDetailLine>>
}

export function buildOFDetailsMatrix(details: OFDetailLine[]): OFDetailsMatrix {
  const tailles = [...new Set(details.map((d) => d.taille))]
  const couleurs = [...new Set(details.map((d) => d.couleur))]
  const grid: Record<string, Record<string, OFDetailLine>> = {}
  for (const d of details) {
    if (!grid[d.taille]) grid[d.taille] = {}
    grid[d.taille][d.couleur] = d
  }
  return { tailles, couleurs, grid }
}

export function ofTailleTotal(details: OFDetailLine[], taille: string): number {
  return details.filter((d) => d.taille === taille).reduce((s, d) => s + d.quantite, 0)
}
