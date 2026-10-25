"use client"

import { ArrowLeft, Send, CheckCircle2, XCircle, Ban } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AvoirStatusBadge } from "@/components/status-badge"
import type { AvoirStatus } from "@/lib/types"

export function AvoirDetailHeader({
  avoir, isPending, onBack, onStatusChange,
}: {
  avoir: { numero: string; status: AvoirStatus; type: string }
  isPending: boolean
  onBack: () => void
  onStatusChange: (status: AvoirStatus) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Button>
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-base font-semibold">{avoir.numero}</h1>
        <AvoirStatusBadge status={avoir.status} />
        <Badge variant="outline" className="text-xs border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400">
          {avoir.type === "SIMPLE" ? "Simple" : "Financier"}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {avoir.status === "BROUILLON" && (
          <>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => onStatusChange("EMIS")} disabled={isPending}>
              <Send className="h-3.5 w-3.5" /> Émettre
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-600" onClick={() => onStatusChange("ANNULE")} disabled={isPending}>
              <Ban className="h-3.5 w-3.5" /> Annuler
            </Button>
          </>
        )}
        {avoir.status === "EMIS" && (
          <>
            <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700" onClick={() => onStatusChange("REMBOURSE")} disabled={isPending}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Marquer Remboursé
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-600" onClick={() => onStatusChange("ANNULE")} disabled={isPending}>
              <XCircle className="h-3.5 w-3.5" /> Annuler
            </Button>
          </>
        )}
        {avoir.status === "REMBOURSE" && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs text-red-600" onClick={() => onStatusChange("ANNULE")} disabled={isPending}>
            <XCircle className="h-3.5 w-3.5" /> Annuler
          </Button>
        )}
      </div>
    </div>
  )
}
