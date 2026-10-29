"use client"

import { useAchatFormStore, useScanAchatStore } from "@/lib/stores/achats-store"
import { useAchatMutations } from "@/hooks/use-achats"
import { useAchatBls } from "@/hooks/use-achats-queries"
import { useFournisseurs, useProducts } from "@/hooks/use-queries"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2 } from "lucide-react"
import { notify } from "@/lib/notify"
import { useRouter } from "next/navigation"
import { ScanVerifHeader } from "./scan-verif-header"
import { ScanVerifFournisseur } from "./scan-verif-fournisseur"
import { ScanVerifLinesTable } from "./scan-verif-lines-table"
import { ScanVerifBottom } from "./scan-verif-bottom"
import {
  ScanVerifClassification,
  ScanVerifCreateFournisseurNotice,
  ScanVerifDocumentPreview,
  ScanVerifExtractedData,
} from "./scan-verif-sections"
import {
  buildAchatScanPayload,
  resolveProductSelection,
  validateScanAchatForm,
} from "./scan-verif-logic"

export function ScanVerificationForm() {
  const router = useRouter()
  const form = useAchatFormStore()
  const scan = useScanAchatStore()
  const { createAchat } = useAchatMutations()
  const { data: fournisseursData } = useFournisseurs()
  const { data: productsData } = useProducts()
  const { data: blsData } = useAchatBls(form.tiersId)
  const fournisseurs = (fournisseursData?.fournisseurs ?? []) as { id: string; raisonSociale: string }[]
  const products = productsData?.products ?? []
  const bls = blsData?.achats ?? []

  const selectedFournisseur = fournisseurs.find((f) => f.id === form.tiersId)
  const filteredFournisseurs = fournisseurs.filter((f) =>
    f.raisonSociale.toLowerCase().includes(form.tiersSearch.toLowerCase())
  )
  const filteredProducts = products.filter((p) => {
    const q = form.productSearch.toLowerCase()
    return p.nom.toLowerCase().includes(q) || (p.code && p.code.toLowerCase().includes(q))
  })

  const handleReset = () => { scan.resetScan(); form.resetForm() }

  const handleConfirm = () => {
    const validationError = validateScanAchatForm(form, scan.extracted)
    if (validationError) { notify.error(validationError); return }
    scan.setScanState("confirming")
    createAchat.mutate(
      buildAchatScanPayload(form, scan.extracted),
      {
        onSuccess: () => { notify.success({ title: "Achat enregistré", description: "Stock mis à jour." }); handleReset(); router.push("/achats") },
        onError: (err) => { notify.error({ title: "Achat non créé", error: err, context: "création de l'achat depuis le scan" }); scan.setScanState("extracted") },
      }
    )
  }

  const handleProductSelect = (lineId: string, productId: string) => {
    const updates = resolveProductSelection(products, form.lines, lineId, productId)
    if (updates) form.updateLine(lineId, updates)
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <ScanVerifHeader onReset={handleReset} />

        <div className="grid grid-cols-5 gap-4">
          <ScanVerifDocumentPreview previewUrl={scan.previewUrl} fileName={scan.fileName} />

          <div className="col-span-3 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Vérification des données</h2>
                <p className="text-xs text-muted-foreground">Modifiez les champs si nécessaire avant de valider</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirm} disabled={createAchat.isPending}>
                  {createAchat.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  {createAchat.isPending ? "Création..." : "Confirmer l'Achat"}
                </Button>
              </div>
            </div>

            {!form.tiersId && scan.extracted?.fournisseur?.raisonSociale && (
              <ScanVerifCreateFournisseurNotice
                raisonSociale={scan.extracted.fournisseur.raisonSociale}
                checked={form.createFournisseur}
                onCheckedChange={form.setCreateFournisseur}
              />
            )}

            <ScanVerifFournisseur
              fournisseurs={fournisseurs}
              filteredFournisseurs={filteredFournisseurs}
              selectedFournisseur={selectedFournisseur}
              referenceFournisseur={form.referenceFournisseur}
              dateFacture={form.dateFacture}
              dateEcheance={form.dateEcheance}
              fournisseurSearch={form.tiersSearch}
              type={form.type}
              onFournisseurChange={form.setTiersId}
              onSearchChange={form.setTiersSearch}
              onRefChange={form.setReferenceFournisseur}
              onDateFactureChange={form.setDateFacture}
              onDateEcheanceChange={form.setDateEcheance}
            />

            <ScanVerifClassification
              type={form.type}
              tiersId={form.tiersId}
              categorieAchat={form.categorieAchat}
              blAchatId={form.blAchatId}
              bls={bls}
              onCategorieChange={form.setCategorieAchat}
              onBlChange={form.setBlAchatId}
            />

            {scan.extracted && (
              <ScanVerifExtractedData extracted={scan.extracted} />
            )}

            <ScanVerifLinesTable
              lines={form.lines}
              products={products}
              filteredProducts={filteredProducts}
              productSearch={form.productSearch}
              onAddLine={() => form.addLine()}
              onRemoveLine={(id) => form.removeLine(id)}
              onUpdateLine={(id, updates) => form.updateLine(id, updates)}
              onProductSelect={handleProductSelect}
              onProductSearchChange={form.setProductSearch}
            />

            <ScanVerifBottom
              notes={form.notes}
              timbreFiscal={form.timbreFiscal}
              totalHT={form.totalHT}
              totalTVA={form.totalTVA}
              totalTTC={form.totalTTC}
              isPending={createAchat.isPending}
              onNotesChange={form.setNotes}
              onTimbreChange={form.setTimbreFiscal}
              onTotalHTChange={form.setTotalHT}
              onTotalTVAChange={form.setTotalTVA}
              onTotalTTCChange={form.setTotalTTC}
              onReset={handleReset}
              onConfirm={handleConfirm}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
