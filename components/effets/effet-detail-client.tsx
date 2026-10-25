"use client"

import { useEffetDetail } from "@/hooks/use-effets"
import { useCompany } from "@/hooks/use-company-query"
import { useCompanyId } from "@/hooks/use-queries-shared"
import { useEffetSplits } from "@/hooks/use-effet-splits"
import { Skeleton } from "@/components/ui/skeleton"
import { EffetDetailHero } from "./effet-detail-hero"
import { EffetDetailSections } from "./effet-detail-sections"
import { EffetDetailLinks } from "./effet-detail-links"
import { EffetDetailSidebar } from "./effet-detail-sidebar"
import { EffetDetailDialogs } from "./effet-detail-dialogs"
import { ApercuEffetDialog } from "./apercu-effet-dialog"
import { useEffetDetailActions } from "./use-effet-detail-actions"

export function EffetDetailClient({ id }: { id: string }) {
    const { data, isLoading, isError } = useEffetDetail(id)
    const companyId = useCompanyId()
    const { data: companyData } = useCompany(companyId ?? null)
    const { data: splitData } = useEffetSplits(id)

    const isRECU = data?.effet?.type === "RECU"
    const actions = useEffetDetailActions({ id, montant: data?.effet?.montant, isRECU })

    if (isLoading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-3 gap-6">
                    <Skeleton className="h-40 col-span-2 rounded-xl" />
                    <Skeleton className="h-40 rounded-xl" />
                </div>
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Effet introuvable
            </div>
        )
    }

    const { effet, payEligibility } = data
    const isSplitEffet = !!(effet.splitGroup && effet.splitTotal && effet.splitTotal > 1)
    const splitSiblings = (splitData?.effets ?? []).filter((e) => e.id !== id)

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <EffetDetailHero effet={effet} isRECU={isRECU} isSplitEffet={isSplitEffet} />

            <div className="grid grid-cols-3 gap-6">
                {/* Colonne principale — Parties + Financier */}
                <div className="col-span-2 space-y-6">
                    <EffetDetailSections effet={effet} isRECU={isRECU} company={companyData?.company} />
                    <EffetDetailLinks effet={effet} isSplitEffet={isSplitEffet} splitSiblings={splitSiblings} />
                </div>

                {/* Colonne droite — sticky */}
                <EffetDetailSidebar effet={effet} payEligibility={payEligibility} actions={actions} />
            </div>

            <EffetDetailDialogs effet={effet} isRECU={isRECU} actions={actions} />

            {/* Preview */}
            <ApercuEffetDialog
                effet={effet}
                open={actions.showPreview}
                onOpenChange={actions.setShowPreview}
                companyName={companyData?.company?.name}
                splitEffets={isSplitEffet ? splitSiblings : undefined}
            />
        </div>
    )
}
