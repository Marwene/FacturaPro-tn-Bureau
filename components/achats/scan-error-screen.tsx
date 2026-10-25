"use client"

import { useScanAchatStore, useAchatFormStore } from "@/lib/stores/achats-store"
import { Button } from "@/components/ui/button"
import { AlertCircle, Upload, PenLine } from "lucide-react"

export function ScanErrorScreen() {
  const scan = useScanAchatStore()
  const form = useAchatFormStore()

  const handleReset = () => {
    scan.resetScan()
    form.resetForm()
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center flex flex-col gap-4 max-w-md">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mx-auto">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Erreur d&apos;extraction</h2>
          <p className="text-sm text-muted-foreground">{scan.errorMsg}</p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" className="gap-1.5 text-xs" onClick={handleReset}>
            <Upload className="h-3.5 w-3.5" />
            Réessayer
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => scan.setShowManual(true)}>
            <PenLine className="h-3.5 w-3.5" />
            Saisie manuelle
          </Button>
        </div>
      </div>
    </div>
  )
}
