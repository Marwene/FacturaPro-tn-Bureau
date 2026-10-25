"use client"

import { useAvoirDetail, useAvoirMutations } from "@/hooks/use-avoirs"
import { StatCard } from "@/components/stat-card"
import { notify } from "@/lib/notify"
import { useRouter } from "next/navigation"
import { formatTND } from "@/lib/decimal"
import type { AvoirStatus } from "@/lib/types"
import { AvoirDetailSkeleton } from "./avoir-detail-skeleton"
import { AvoirDetailHeader } from "./avoir-detail-header"
import { AvoirDetailLeftColumn } from "./avoir-detail-left-column"
import { AvoirDetailSidebar } from "./avoir-detail-sidebar"

export function AvoirDetailClient({ id }: { id: string }) {
  const router = useRouter()
  const { data, isLoading } = useAvoirDetail(id)
  const { updateStatus } = useAvoirMutations()

  if (isLoading) return <AvoirDetailSkeleton />
  if (!data) return null

  const { avoir } = data
  const client = avoir.tiers
  const lines = avoir.lines ?? []
  const payments = avoir.payments ?? []
  const mouvements = avoir.mouvements ?? []

  const handleStatus = (status: AvoirStatus) => {
    updateStatus.mutate(
      { id, status },
      {
        onSuccess: () => notify.success({ title: `Avoir ${avoir.numero} mis à jour`, description: "Le statut a été modifié." }),
        onError: (err) => notify.error({ title: "Changement de statut impossible", error: err, context: "mise à jour du statut de l'avoir" }),
      }
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4">
      <AvoirDetailHeader
        avoir={avoir}
        isPending={updateStatus.isPending}
        onBack={() => router.back()}
        onStatusChange={handleStatus}
      />

      <div className="grid grid-cols-4 gap-3">
        <StatCard title="Total TTC" value={formatTND(avoir.totalTTC)} />
        <StatCard title="Base HT" value={formatTND(avoir.baseHT)} />
        <StatCard title="TVA" value={formatTND(avoir.totalTVA)} />
        {parseFloat(avoir.totalFodec) > 0 && <StatCard title="FODEC" value={formatTND(avoir.totalFodec)} />}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AvoirDetailLeftColumn avoir={avoir} lines={lines} payments={payments} mouvements={mouvements} />
        <AvoirDetailSidebar tiers={client} avoir={avoir} />
      </div>
    </div>
  )
}
