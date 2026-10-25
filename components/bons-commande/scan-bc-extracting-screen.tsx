"use client"

import { CheckCircle2, ChevronRight, Loader2, Scan } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type Step = "idle" | "uploading" | "extracting" | "success" | "error"

interface Props {
  current: Step
}

function StepIndicator({ current }: Props) {
  const steps = [
    { key: "uploading", label: "Upload" },
    { key: "extracting", label: "Extraction IA" },
    { key: "success", label: "Vérification" },
  ]
  const getIndex = (s: Step) => {
    if (s === "idle") return -1
    if (s === "uploading") return 0
    if (s === "extracting") return 1
    return 2
  }
  const activeIndex = getIndex(current)

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            i <= activeIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            {i < activeIndex ? <CheckCircle2 className="h-4 w-4" />
              : i === activeIndex ? <Loader2 className="h-4 w-4 animate-spin" />
              : <div className="h-4 w-4 rounded-full border-2" />}
            {s.label}
          </div>
          {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      ))}
    </div>
  )
}

export function ScanBCExtractingScreen({ step }: { step: Step }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <StepIndicator current={step} />
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Scan className="h-5 w-5 animate-pulse" />
          <span>
            {step === "uploading" ? "Téléchargement du fichier..." : "Extraction des données par IA..."}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
