"use client"

import { useScanAchatStore, useAchatFormStore } from "@/lib/stores/achats-store"
import { Button } from "@/components/ui/button"
import { Scan, Loader2 } from "lucide-react"

export function ScanExtractingScreen() {
  const scan = useScanAchatStore()
  const form = useAchatFormStore()

  const handleReset = () => {
    scan.resetScan()
    form.resetForm()
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center flex flex-col gap-6 max-w-md">
        <div className="relative">
          <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mx-auto">
            <Scan className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Extraction en cours...</h2>
          <p className="text-sm text-muted-foreground">{scan.fileName}</p>
        </div>

        <div className="flex flex-col gap-3 text-left">
          {[
            "Analyse du document...",
            "Identification du fournisseur...",
            "Extraction des lignes...",
            "Calcul des totaux...",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/20">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              </div>
              <span className="text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>

        {scan.previewUrl && (
          <div className="mt-4 rounded-lg overflow-hidden border border-border max-h-48">
            {scan.fileName.endsWith(".pdf") ? (
              <iframe src={scan.previewUrl} className="w-full h-48 bg-muted" title="Preview" />
            ) : (
              <img src={scan.previewUrl} alt="Document" loading="lazy" className="w-full object-contain max-h-48 bg-muted" />
            )}
          </div>
        )}

        <Button variant="ghost" size="sm" className="text-xs" onClick={handleReset}>
          Annuler
        </Button>
      </div>
    </div>
  )
}
