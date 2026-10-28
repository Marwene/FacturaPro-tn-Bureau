import type { SerializedEffet } from "@/lib/types"
import {
    LETTRE_PAGE_WIDTH_MM,
    LETTRE_PAGE_HEIGHT_MM,
} from "./lettre-de-change"

// Dimensions de référence (px CSS) du gabarit de page à l'échelle 100% de
// zoom "ajusté" — le composant recalcule ensuite un facteur d'échelle pour
// remplir l'espace disponible, puis applique le zoom utilisateur par-dessus.
export const BASE_WIDTH_PX = 640
export const BASE_HEIGHT_PX = Math.round((BASE_WIDTH_PX * LETTRE_PAGE_HEIGHT_MM) / LETTRE_PAGE_WIDTH_MM)

export const ZOOM_MIN = 40
export const ZOOM_MAX = 250
export const ZOOM_STEP = 15

export function buildInitialBatch(
    effetsProp: SerializedEffet[] | undefined,
    effet: SerializedEffet | undefined,
    splitEffets: SerializedEffet[] | undefined,
): SerializedEffet[] {
    if (effetsProp?.length) return effetsProp
    if (effet) return splitEffets?.length ? [effet, ...splitEffets] : [effet]
    return []
}

export function computeFitScale(availW: number, availH: number): number {
    const scale = Math.min(availW / BASE_WIDTH_PX, availH / BASE_HEIGHT_PX, 1.6)
    return Math.max(scale, 0.15)
}

export function previewScale(fitScale: number, zoomPct: number): number {
    return fitScale * (zoomPct / 100)
}

export function stepZoomIn(zoomPct: number): number {
    return Math.min(ZOOM_MAX, zoomPct + ZOOM_STEP)
}

export function stepZoomOut(zoomPct: number): number {
    return Math.max(ZOOM_MIN, zoomPct - ZOOM_STEP)
}

export function zoomFromWheelDelta(zoomPct: number, deltaY: number): number {
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoomPct - deltaY * 0.4)))
}

export function pageIndexAfterRemove(pageIndex: number, nextLength: number): number {
    return pageIndex >= nextLength ? Math.max(0, nextLength - 1) : pageIndex
}

export function sumMontant(items: SerializedEffet[]): number {
    return items.reduce((s, e) => s + parseFloat(e.montant || "0"), 0)
}
