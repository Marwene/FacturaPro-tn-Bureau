import { deserializeDecimal } from "@/lib/decimal"
import type { useEffetDetail } from "@/hooks/use-effets"
import type { EffetStatus } from "@/lib/types"

type EffetDetailData = NonNullable<ReturnType<typeof useEffetDetail>["data"]>

export type EffetForDetail = EffetDetailData["effet"]
export type PayEligibilityInfo = EffetDetailData["payEligibility"]

export interface EffetActionField {
    key: string
    label: string
    type: string
}

export interface EffetActionDialog {
    action: EffetStatus
    title: string
    fields?: EffetActionField[]
}

export function computeNetEncaisse(montant: string, taux: string, frais: string): string {
    const m = deserializeDecimal(montant)
    const t = deserializeDecimal(taux)
    const f = deserializeDecimal(frais)
    const net = m.minus(m.times(t).div(100)).minus(f)
    return net.gte(0) ? net.toFixed(4) : "0.0000"
}

export function computeEscompte(montant: string, taux: string): string {
    return deserializeDecimal(montant).times(deserializeDecimal(taux)).div(100).toFixed(4)
}

export function buildActionPayload(
    dialog: EffetActionDialog,
    actionData: Record<string, string>,
    montant: string | undefined,
): Record<string, unknown> {
    const payload: Record<string, unknown> = { status: dialog.action }
    for (const [k, v] of Object.entries(actionData)) payload[k] = v
    if (dialog.action === "REMIS_ESCOMPTE" && montant && actionData.tauxEscompte && actionData.tauxEscompte.trim() !== "") {
        payload.frais = computeEscompte(montant, actionData.tauxEscompte)
    }
    return payload
}

export function applyActionFieldChange(
    prev: Record<string, string>,
    key: string,
    value: string,
    recomputeNet: boolean,
    montant: string,
): Record<string, string> {
    const next = { ...prev, [key]: value }
    if (recomputeNet && (key === "tauxEscompte" || key === "frais")) {
        next.netEncaisse = computeNetEncaisse(montant, next.tauxEscompte ?? "", next.frais ?? "")
    }
    return next
}

export function prefillTmmActionData(
    prev: Record<string, string>,
    tmm: string,
    montant: string,
): Record<string, string> {
    if (prev.tauxEscompte && prev.tauxEscompte.trim() !== "") return prev
    const taux = deserializeDecimal(tmm).plus(3).toFixed(2)
    return {
        ...prev,
        tauxEscompte: taux,
        netEncaisse: computeNetEncaisse(montant, taux, prev.frais ?? ""),
    }
}
