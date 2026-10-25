"use client"

import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export function ScanBCErrorScreen({ errorMsg, onRetry }: { errorMsg: string; onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erreur d&apos;extraction</AlertTitle>
      <AlertDescription>
        {errorMsg}
        <div className="mt-3">
          <Button variant="outline" size="sm" onClick={onRetry}>Réessayer</Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
