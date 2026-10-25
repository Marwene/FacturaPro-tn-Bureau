"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useScanBCStore } from "@/lib/stores/bons-commande-store"
import { useBonCommandeScan } from "@/hooks/use-bc"
import { notify } from "@/lib/notify"
import { useClients, useProducts } from "@/hooks/use-queries"
import { parseTunisianNumber } from "@/lib/decimal"
import type { ScanBCLine } from "./scan-bc-lines-table"
import { ScanBCUploadScreen } from "./scan-bc-upload-screen"
import { ScanBCExtractingScreen } from "./scan-bc-extracting-screen"
import { ScanBCErrorScreen } from "./scan-bc-error-screen"
import { ScanBCVerificationForm } from "./scan-bc-verification-form"
import { ScanBCManualEntry } from "./scan-bc-manual-entry"

type LineUpdate = Partial<Omit<ScanBCLine, "id">>

interface BCManualLine {
  id: string
  productId: string | null
  createProduct: boolean
  description: string
  quantite: string
  prixHT: string
  remise: string
  tauxTVA: string
  fodec: boolean
  tauxFodec: string
  totalHT: string
  typeSource: "PRODUCTION" | "STOCK"
}

const defaultManualLine = (): BCManualLine => ({
  id: crypto.randomUUID(),
  productId: null,
  createProduct: false,
  description: "",
  quantite: "1",
  prixHT: "0",
  remise: "0",
  tauxTVA: "19",
  fodec: false,
  tauxFodec: "1",
  totalHT: "0",
  typeSource: "STOCK",
})

export function ScanBonCommandeClient() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scan = useScanBCStore()
  const { extractBC, createBC } = useBonCommandeScan()
  const { data: clientsData } = useClients()
  const clients = clientsData?.clients ?? []
  const { data: productsData } = useProducts()
  const products = productsData?.products ?? []

  const matchedClient = clients.find(
    (c) => c.raisonSociale.toLowerCase() === scan.extracted?.clientName?.toLowerCase()
  )

  const processFile = async (file: File) => {
    if (!file) return
    scan.setStep("uploading")
    scan.setErrorMsg("")

    const formData = new FormData()
    formData.append("file", file)

    try {
      scan.setStep("extracting")
      const result = await extractBC.mutateAsync(formData)
      scan.setExtracted(result.extracted)
      scan.setStep("success")
    } catch (e) {
      scan.setStep("error")
      scan.setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    scan.setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleUpdateLine = (id: string, updates: LineUpdate) => {
    if (!scan.extracted) return
    scan.setExtracted({
      ...scan.extracted,
      lines: scan.extracted.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })
  }

  const handleAddLine = () => {
    if (!scan.extracted) return
    const newLine: ScanBCLine = {
      id: crypto.randomUUID(),
      productId: null,
      createProduct: false,
      description: "",
      quantite: "1",
      prixHT: "0",
      remise: "0",
      tauxTVA: "19",
      fodec: false,
      tauxFodec: "1",
      totalHT: "0",
      typeSource: "STOCK",
    }
    scan.setExtracted({ ...scan.extracted, lines: [...scan.extracted.lines, newLine] })
  }

  const handleRemoveLine = (id: string) => {
    if (!scan.extracted) return
    if (scan.extracted.lines.length <= 1) return
    scan.setExtracted({ ...scan.extracted, lines: scan.extracted.lines.filter((l) => l.id !== id) })
  }

  const buildPayload = (asDraft: boolean) => {
    if (!scan.extracted) return null
    const tiersId = scan.formTiersId || matchedClient?.id || null
    const willCreateClient = !tiersId && scan.createClient && !!scan.extracted.clientName
    if (!tiersId && !willCreateClient) {
      notify.warning({
        title: "Client non renseigné",
        description: "Sélectionnez un client pour enregistrer le bon de commande.",
      })
      return null
    }
    return {
      tiersId: tiersId || undefined,
      createClient: willCreateClient,
      client: willCreateClient ? { raisonSociale: scan.extracted.clientName } : undefined,
      dateCreation: scan.formDate,
      dateExpiration: scan.formDateExpiration || null,
      referenceClient: scan.formRefClient || null,
      notes: scan.extracted.notes || scan.formNotes,
      asDraft,
      totalHT: scan.totalHT ? parseTunisianNumber(scan.totalHT) : undefined,
      totalTVA: scan.totalTVA ? parseTunisianNumber(scan.totalTVA) : undefined,
      totalTTC: scan.totalTTC ? parseTunisianNumber(scan.totalTTC) : undefined,
      timbreFiscal: scan.timbreFiscal ? parseTunisianNumber(scan.timbreFiscal) : 0,
      lines: scan.extracted.lines.map((l) => ({
        productId: l.productId,
        createProduct: l.createProduct,
        description: l.description,
        quantite: parseTunisianNumber(l.quantite) || 1,
        prixHT: parseTunisianNumber(l.prixHT) || 0,
        remise: parseTunisianNumber(l.remise) || 0,
        tauxTVA: Number(l.tauxTVA) || 19,
        fodec: l.fodec || false,
        tauxFodec: 1,
        typeSource: l.typeSource,
      })),
    }
  }

  const handleConfirm = async () => {
    const payload = buildPayload(false)
    if (!payload) return
    try {
      const result = await createBC.mutateAsync(payload)
      notify.success({ title: `Bon de commande ${result.data.numero} créé` })
      scan.resetScan()
      router.push(`/bons-commande/${result.data.id}`)
    } catch (e) {
      notify.error({
        title: "Création du bon de commande impossible",
        error: e,
        context: "lors de la création du bon de commande depuis le scan",
      })
    }
  }

  const handleSaveDraft = async () => {
    const payload = buildPayload(true)
    if (!payload) return
    try {
      const result = await createBC.mutateAsync(payload)
      notify.success({
        title: `Brouillon ${result.data.numero} enregistré`,
        description: "Complétez puis validez-le depuis le détail du bon de commande.",
      })
      scan.resetScan()
      router.push(`/bons-commande/${result.data.id}`)
    } catch (e) {
      notify.error({
        title: "Enregistrement du brouillon impossible",
        error: e,
        context: "lors de l'enregistrement du brouillon depuis le scan",
      })
    }
  }

  // Manual entry state
  const [manualLines, setManualLines] = useState<BCManualLine[]>([defaultManualLine()])

  const handleManualUpdateLine = (id: string, updates: Partial<BCManualLine>) => {
    setManualLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }

  const handleManualAddLine = () => {
    setManualLines((prev) => [...prev, defaultManualLine()])
  }

  const handleManualRemoveLine = (id: string) => {
    setManualLines((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((l) => l.id !== id)
    })
  }

  const handleManualSave = async () => {
    if (!scan.formTiersId) {
      notify.warning({
        title: "Client non renseigné",
        description: "Sélectionnez un client pour enregistrer le bon de commande.",
      })
      return
    }
    try {
      const payload = {
        tiersId: scan.formTiersId,
        dateCreation: scan.formDate,
        dateExpiration: scan.formDateExpiration || null,
        referenceClient: scan.formRefClient || null,
        notes: scan.formNotes,
        asDraft: false,
        createClient: false,
        timbreFiscal: 1.000,
        lines: manualLines.map((l) => ({
          productId: l.productId,
          createProduct: l.createProduct,
          description: l.description || "Article saisi manuellement",
          quantite: parseTunisianNumber(l.quantite) || 1,
          prixHT: parseTunisianNumber(l.prixHT) || 0,
          remise: parseTunisianNumber(l.remise) || 0,
          tauxTVA: Number(l.tauxTVA) || 19,
          fodec: l.fodec || false,
          tauxFodec: 1,
          typeSource: l.typeSource,
        })),
      }
      const result = await createBC.mutateAsync(payload)
      notify.success({ title: `Bon de commande ${result.data.numero} créé` })
      scan.resetScan()
      setManualLines([defaultManualLine()])
      router.push(`/bons-commande/${result.data.id}`)
    } catch (e) {
      notify.error({
        title: "Création du bon de commande impossible",
        error: e,
        context: "lors de la création du bon de commande en saisie manuelle",
      })
    }
  }

  const handleManualCancel = () => {
    scan.setShowManual(false)
    setManualLines([defaultManualLine()])
  }

  const isSaving = scan.step === "uploading" || scan.step === "extracting" || createBC.isPending

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {scan.step === "idle" && !scan.showManual && (
        <ScanBCUploadScreen
          fileInputRef={fileInputRef}
          dragOver={scan.dragOver}
          onDragOver={scan.setDragOver}
          onDrop={handleDrop}
          onFileInput={handleFileInput}
          onClickUpload={() => fileInputRef.current?.click()}
          onShowManual={() => scan.setShowManual(true)}
        />
      )}

      {scan.showManual && (
        <ScanBCManualEntry
          clients={clients}
          products={products}
          formTiersId={scan.formTiersId}
          onFormTiersId={scan.setFormTiersId}
          formDate={scan.formDate}
          onFormDate={scan.setFormDate}
          formDateExpiration={scan.formDateExpiration}
          onFormDateExpiration={scan.setFormDateExpiration}
          formRefClient={scan.formRefClient}
          onFormRefClient={scan.setFormRefClient}
          formNotes={scan.formNotes}
          onFormNotes={scan.setFormNotes}
          lines={manualLines}
          onAddLine={handleManualAddLine}
          onRemoveLine={handleManualRemoveLine}
          onUpdateLine={handleManualUpdateLine}
          onSave={handleManualSave}
          onCancel={handleManualCancel}
          isSaving={isSaving}
        />
      )}

      {(scan.step === "uploading" || scan.step === "extracting") && (
        <ScanBCExtractingScreen step={scan.step} />
      )}

      {scan.step === "error" && (
        <ScanBCErrorScreen errorMsg={scan.errorMsg} onRetry={() => { scan.setStep("idle"); scan.setErrorMsg("") }} />
      )}

      {scan.step === "success" && scan.extracted && (
        <ScanBCVerificationForm
          extracted={scan.extracted}
          clients={clients}
          matchedClient={matchedClient}
          formTiersId={scan.formTiersId}
          onFormTiersId={scan.setFormTiersId}
          formDate={scan.formDate}
          onFormDate={scan.setFormDate}
          formNotes={scan.formNotes}
          onFormNotes={scan.setFormNotes}
          formRefClient={scan.formRefClient}
          onFormRefClient={scan.setFormRefClient}
          formDateExpiration={scan.formDateExpiration}
          onFormDateExpiration={scan.setFormDateExpiration}
          createClient={scan.createClient}
          onCreateClient={scan.setCreateClient}
          totalHT={scan.totalHT}
          onTotalHT={scan.setTotalHT}
          totalTVA={scan.totalTVA}
          onTotalTVA={scan.setTotalTVA}
          totalTTC={scan.totalTTC}
          onTotalTTC={scan.setTotalTTC}
          timbreFiscal={scan.timbreFiscal}
          onTimbreFiscal={scan.setTimbreFiscal}
          products={products}
          onUpdateLine={handleUpdateLine}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          onConfirm={handleConfirm}
          onSaveDraft={handleSaveDraft}
          onReset={scan.resetScan}
          isSaving={isSaving}
        />
      )}
    </div>
  )
}
