"use client"

import { useCallback, useState } from "react"
import { useEffetsMutations } from "@/hooks/use-effets"
import { useTmmBct } from "@/hooks/use-tmm-bct"
import type { EffetStatus } from "@/lib/types"
import {
    applyActionFieldChange,
    buildActionPayload,
    prefillTmmActionData,
    type EffetActionDialog,
} from "./effet-detail-logic"

export function useEffetDetailActions({ id, montant, isRECU }: { id: string; montant: string | undefined; isRECU: boolean }) {
    const { updateStatus } = useEffetsMutations()
    const [actionDialog, setActionDialog] = useState<EffetActionDialog | null>(null)
    const [actionData, setActionData] = useState<Record<string, string>>({})
    const [showPreview, setShowPreview] = useState(false)
    const [confirmPayOpen, setConfirmPayOpen] = useState(false)
    const [prefilledTmm, setPrefilledTmm] = useState<string | null>(null)

    const isEscompteRecu = isRECU && actionDialog?.action === "REMIS_ESCOMPTE"
    const { data: tmmData, isLoading: tmmLoading } = useTmmBct(!!isEscompteRecu)

    if (isEscompteRecu && tmmData?.tmm && prefilledTmm !== tmmData.tmm) {
        setPrefilledTmm(tmmData.tmm)
        setActionData((prev) => prefillTmmActionData(prev, tmmData.tmm, montant ?? "0"))
    }

    const handleAction = useCallback(() => {
        if (!actionDialog) return
        updateStatus.mutate({ id, ...buildActionPayload(actionDialog, actionData, montant) })
        setActionDialog(null)
        setActionData({})
    }, [actionDialog, actionData, montant, id, updateStatus])

    const handleFieldChange = useCallback((key: string, value: string) => {
        setActionData((prev) => applyActionFieldChange(prev, key, value, !!isEscompteRecu, montant ?? "0"))
    }, [isEscompteRecu, montant])

    const confirmPay = useCallback(() => {
        updateStatus.mutate({ id, status: "PAYE" as EffetStatus })
        setConfirmPayOpen(false)
    }, [id, updateStatus])

    const cancelEffet = useCallback(() => {
        updateStatus.mutate({ id, status: "ANNULE" as EffetStatus })
    }, [id, updateStatus])

    return {
        actionDialog,
        setActionDialog,
        actionData,
        handleAction,
        handleFieldChange,
        showPreview,
        setShowPreview,
        confirmPayOpen,
        setConfirmPayOpen,
        confirmPay,
        cancelEffet,
        isEscompteRecu,
        tmm: tmmData?.tmm,
        tmmLoading,
    }
}
