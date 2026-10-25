"use client"

import { useScanAchatStore } from "@/lib/stores/achats-store"
import { ScanUploadScreen } from "./scan-upload-screen"
import { ScanExtractingScreen } from "./scan-extracting-screen"
import { ScanErrorScreen } from "./scan-error-screen"
import { ScanVerificationForm } from "./scan-verification-form"

export function ScanAchatClient({ type }: { type: "BL" | "FACTURE" }) {
  const scan = useScanAchatStore()

  switch (scan.scanState) {
    case "extracting":
      return <ScanExtractingScreen />
    case "error":
      return <ScanErrorScreen />
    case "extracted":
    case "confirming":
      return <ScanVerificationForm />
    default:
      return <ScanUploadScreen type={type} />
  }
}
