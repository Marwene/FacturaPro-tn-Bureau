import type { CartonType } from "@/hooks/use-carton-types"

export interface CartonTypeForm {
  nom: string
  capacite: string
  longueur: string
  largeur: string
  hauteur: string
}

export interface CartonTypePayload {
  nom: string
  capacite: number
  longueur: number | null
  largeur: number | null
  hauteur: number | null
}

export type CartonTypeFormParseResult =
  | { ok: true; payload: CartonTypePayload }
  | { ok: false; error: { title: string; description: string } }

export const defaultCartonTypeForm: CartonTypeForm = {
  nom: "",
  capacite: "24",
  longueur: "",
  largeur: "",
  hauteur: "",
}

export function cartonTypeToForm(item: CartonType): CartonTypeForm {
  return {
    nom: item.nom,
    capacite: String(item.capacite),
    longueur: item.longueur?.toString() ?? "",
    largeur: item.largeur?.toString() ?? "",
    hauteur: item.hauteur?.toString() ?? "",
  }
}

function optionalDim(value: string): number | null {
  const trimmed = value.trim()
  return trimmed === "" ? null : Number(trimmed)
}

export function parseCartonTypeForm(form: CartonTypeForm): CartonTypeFormParseResult {
  const nom = form.nom.trim()
  const capacite = parseInt(form.capacite, 10)
  if (!nom) {
    return {
      ok: false,
      error: {
        title: "Nom du type de carton requis",
        description: "Saisissez un nom pour identifier ce type de carton.",
      },
    }
  }
  if (!Number.isFinite(capacite) || capacite < 1) {
    return {
      ok: false,
      error: {
        title: "Capacité invalide",
        description: "La capacité doit être d'au moins 1 pièce.",
      },
    }
  }
  return {
    ok: true,
    payload: {
      nom,
      capacite,
      longueur: optionalDim(form.longueur),
      largeur: optionalDim(form.largeur),
      hauteur: optionalDim(form.hauteur),
    },
  }
}
