"use client"

import { CheckCircle2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ScanVerifHeader({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Données extraites avec succès</p>
          <p className="text-xs text-emerald-600">Vérifiez et corrigez les informations ci-dessous avant de confirmer</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={onReset}>
        <Upload className="h-3 w-3" /> Nouveau scan
      </Button>
    </div>
  )
}
