"use client"

import { useRef } from "react"
import { useScanAchatStore, useAchatFormStore, type AchatFormState } from "@/lib/stores/achats-store"
import { useFournisseurs, useProducts } from "@/hooks/use-queries"
import { useAchatScan } from "@/hooks/use-achats"
import { useAchatScanTypeInit } from "@/hooks/use-achats-queries"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Upload, PenLine, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { ManualEntryForm } from "./manual-entry-form"
import Big from "big.js"
import { formatCurrency } from "@/lib/decimal"
import type { AchatType } from "@/lib/types"
import { describeApiError, notify } from "@/lib/notify"

export function ScanUploadScreen({ type }: { type: "BL" | "FACTURE" }) {
  const scan = useScanAchatStore()
  const form = useAchatFormStore()
  const { data: fournisseursData } = useFournisseurs()
  const { data: productsData } = useProducts()
  const fournisseurs = (fournisseursData?.fournisseurs ?? []) as { id: string; raisonSociale: string; matriculeFiscal?: string | null; ville?: string | null }[]
  const products = productsData?.products ?? []
  const extractMutation = useAchatScan()
  // Init du store `type` depuis l'URL — hooks/use-achats-queries.ts
  // (ex-useEffect [type] transformé en query TanStack, clé/staleTime/retry
  // identiques, garde d'idempotence conservée).
  useAchatScanTypeInit(type)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const handleFile = async (file: File) => {
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      notify.warning({ title: `« ${file.name} » trop volumineux`, description: "Taille maximale acceptée : 20 Mo." })
      return
    }
    scan.setFileName(file.name)
    scan.setPreviewUrl(URL.createObjectURL(file))
    scan.setScanState("extracting")
    scan.setErrorMsg("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)
      const data = await extractMutation.mutateAsync(formData)
      scan.setExtracted(data.extracted)
      applyExtractedData(data.extracted, fournisseurs, form)
      scan.setScanState("extracted")
    } catch (err) {
      scan.setScanState("error")
      scan.setErrorMsg(describeApiError(err).message)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleReset = () => {
    scan.resetScan()
    form.resetForm()
  }

  const selectedFournisseur = fournisseurs.find((f) => f.id === form.tiersId)

  // Compute totals
  let totalHT = new Big(0)
  let totalTVA = new Big(0)
  for (const line of form.lines) {
    const qty = new Big(parseFloat(line.quantite) || 0)
    const prix = new Big(parseFloat(line.prixAchat) || 0)
    const rem = new Big(parseFloat(line.remise) || 0)
    const ht = qty.times(prix).times(new Big(1).minus(rem.div(100)))
    const tva = ht.times(new Big(parseFloat(line.tauxTVA) || 0).div(100))
    totalHT = totalHT.plus(ht)
    totalTVA = totalTVA.plus(tva)
  }
  const totalTTC = totalHT.plus(totalTVA).plus(new Big(parseFloat(form.timbreFiscal) || 0))

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        {/* Type selector */}
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => form.setType("FACTURE")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              form.type === "FACTURE"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            Facture Achat
          </button>
          <button
            type="button"
            onClick={() => form.setType("BL")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              form.type === "BL"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            BL Achat
          </button>
        </div>

        <div className="text-center flex flex-col gap-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 mb-2 mx-auto">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Scan {form.type === "BL" ? "Bon de Livraison" : "Facture"} Fournisseur</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Importe un{form.type === "BL" ? " BL" : "e facture"} fournisseur (PDF, JPEG, PNG) — l&apos;IA extrait automatiquement les données
          </p>
        </div>

        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative cursor-pointer rounded-2xl border-2 border-dashed p-16 text-center transition-all duration-300",
            "hover:border-primary/50 hover:bg-primary/5",
            "border-muted-foreground/25 bg-muted/30"
          )}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Déposez votre fichier ici ou <span className="text-primary cursor-pointer">parcourir</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPEG, PNG — Max 20 Mo</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">ou</span>
          <Separator className="flex-1" />
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground" onClick={() => scan.setShowManual(true)}>
            <PenLine className="h-3.5 w-3.5" />
            Saisie manuelle (cas extrême)
          </Button>
        </div>

        {scan.showManual && (
          <ManualEntryForm
            form={form}
            fournisseurs={fournisseurs}
            products={products}
            selectedFournisseur={selectedFournisseur}
            totalHT={totalHT}
            totalTVA={totalTVA}
            totalTTC={totalTTC}
            onCancel={() => scan.setShowManual(false)}
          />
        )}
      </div>
    </div>
  )
}

function applyExtractedData(
  data: { fournisseur?: { raisonSociale?: string | null }; dateFacture?: string | null; dateEcheance?: string | null; referenceFournisseur?: string | null; timbreFiscal?: number | null; totalHT?: number | null; totalTVA?: number | null; totalTTC?: number | null; notes?: string | null; lines?: { description: string; quantite: number; prixAchat: number; remise: number; tauxTVA: number; productId?: string | null }[] },
  fournisseurs: { id: string; raisonSociale: string }[],
  form: AchatFormState
) {
  form.resetForm()
  if (data.fournisseur?.raisonSociale) {
    const match = fournisseurs.find(
      (f) =>
        f.raisonSociale.toLowerCase().includes(data.fournisseur!.raisonSociale!.toLowerCase()) ||
        data.fournisseur!.raisonSociale!.toLowerCase().includes(f.raisonSociale.toLowerCase())
    )
    if (match) form.setTiersId(match.id)
  }
  if (data.dateFacture) form.setDateFacture(data.dateFacture)
  if (data.dateEcheance) form.setDateEcheance(data.dateEcheance)
  if (data.referenceFournisseur) form.setReferenceFournisseur(data.referenceFournisseur)
  if (data.timbreFiscal != null) form.setTimbreFiscal(String(data.timbreFiscal))
  if (data.totalHT != null) form.setTotalHT(String(data.totalHT))
  if (data.totalTVA != null) form.setTotalTVA(String(data.totalTVA))
  if (data.totalTTC != null) form.setTotalTTC(String(data.totalTTC))
  if (data.notes) form.setNotes(data.notes)
  form.removeLine(form.lines[0]?.id)
  if (data.lines && data.lines.length > 0) {
    data.lines.forEach((line) => {
      form.addLine()
      const state = useAchatFormStore.getState()
      const newLine = state.lines[state.lines.length - 1]
      if (newLine) {
        form.updateLine(newLine.id, {
          description: line.description,
          quantite: String(line.quantite),
          prixAchat: String(line.prixAchat),
          remise: String(line.remise),
          tauxTVA: String(line.tauxTVA),
          productId: line.productId ?? undefined,
        })
      }
    })
  } else {
    form.addLine()
  }
}
