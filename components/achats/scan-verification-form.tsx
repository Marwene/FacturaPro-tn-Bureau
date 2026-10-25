"use client"

import { useAchatFormStore, useScanAchatStore, ACHAT_CATEGORIE_LABELS } from "@/lib/stores/achats-store"
import { useAchatMutations } from "@/hooks/use-achats"
import { useAchatBls } from "@/hooks/use-achats-queries"
import type { AchatCategorie } from "@/lib/types"
import { useFournisseurs, useProducts } from "@/hooks/use-queries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sparkles, FileText, CheckCircle2, Loader2, Tag } from "lucide-react"
import { formatCurrency } from "@/lib/decimal"
import { notify } from "@/lib/notify"
import { useRouter } from "next/navigation"
import { parseTunisianNumber } from "@/lib/decimal"
import { ScanVerifHeader } from "./scan-verif-header"
import { ScanVerifFournisseur } from "./scan-verif-fournisseur"
import { ScanVerifLinesTable } from "./scan-verif-lines-table"
import { ScanVerifBottom } from "./scan-verif-bottom"

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
    if (!form.tiersId && !(form.createFournisseur && scan.extracted?.fournisseur?.raisonSociale)) { notify.error({ title: "Fournisseur requis", error: "Sélectionnez un fournisseur pour continuer." }); return }
    if (form.lines.length === 0 || form.lines.every((l) => !l.description)) { notify.error({ title: "Ligne d'achat requise", error: "Ajoutez au moins une ligne d'achat." }); return }
    scan.setScanState("confirming")
    createAchat.mutate(
      {
        type: form.type,
        tiersId: form.tiersId,
        createFournisseur: form.createFournisseur,
        fournisseur: scan.extracted?.fournisseur?.raisonSociale ? scan.extracted.fournisseur : undefined,
        dateFacture: form.dateFacture,
        dateEcheance: form.dateEcheance || null,
        referenceFournisseur: form.referenceFournisseur || null,
        timbreFiscal: parseTunisianNumber(form.timbreFiscal) || 0,
        totalHT: form.totalHT ? parseTunisianNumber(form.totalHT) : undefined,
        totalTVA: form.totalTVA ? parseTunisianNumber(form.totalTVA) : undefined,
        totalTTC: form.totalTTC ? parseTunisianNumber(form.totalTTC) : undefined,
        notes: form.notes || null,
        categorieAchat: form.categorieAchat,
        blAchatId: form.blAchatId || null,
        asDraft: false,
        lines: form.lines.map((l) => ({
          productId: l.productId || null,
          createProduct: l.createProduct,
          description: l.description,
          quantite: parseTunisianNumber(l.quantite) || 1,
          prixAchat: parseTunisianNumber(l.prixAchat) || 0,
          remise: parseTunisianNumber(l.remise) || 0,
          tauxTVA: parseTunisianNumber(l.tauxTVA) || 19,
        })),
      },
      {
        onSuccess: () => { notify.success({ title: "Achat enregistré", description: "Stock mis à jour." }); handleReset(); router.push("/achats") },
        onError: (err) => { notify.error({ title: "Achat non créé", error: err, context: "création de l'achat depuis le scan" }); scan.setScanState("extracted") },
      }
    )
  }

  const handleProductSelect = (lineId: string, productId: string) => {
    if (productId === "none") return
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const currentLine = form.lines.find((l) => l.id === lineId)
    form.updateLine(lineId, {
      productId: product.id,
      description: currentLine?.description || product.nom,
      prixAchat: currentLine?.prixAchat || product.prixAchat,
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <ScanVerifHeader onReset={handleReset} />

        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-4 w-4" />
                  Document original
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {scan.previewUrl && (
                  scan.fileName.endsWith(".pdf") ? (
                    <iframe src={scan.previewUrl} className="w-full h-[600px] rounded-b-lg" title="Document" />
                  ) : (
                    <img src={scan.previewUrl} alt="Document scanné" loading="lazy" className="w-full object-contain rounded-b-lg max-h-[600px]" />
                  )
                )}
              </CardContent>
            </Card>
          </div>

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
              <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-start gap-2 text-sm text-amber-800">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Fournisseur introuvable — il sera créé automatiquement :{" "}
                    <strong>{scan.extracted.fournisseur.raisonSociale}</strong>
                  </span>
                </p>
                <label className="flex items-center gap-2 text-xs text-amber-800 cursor-pointer">
                  <Checkbox
                    checked={form.createFournisseur}
                    onCheckedChange={(v) => form.setCreateFournisseur(v === true)}
                  />
                  Créer le fournisseur automatiquement
                </label>
              </div>
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Classification
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Catégorie d&apos;achat</Label>
                  <Select
                    value={form.categorieAchat ?? ""}
                    onValueChange={(v) => form.setCategorieAchat(v === "" ? null : (v as AchatCategorie))}
                  >
                    <SelectTrigger className="h-8 text-sm w-full">
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ACHAT_CATEGORIE_LABELS) as AchatCategorie[]).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {ACHAT_CATEGORIE_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.type === "FACTURE" && (
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Rattacher au BL d&apos;achat</Label>
                    <Select
                      value={form.blAchatId ?? "none"}
                      onValueChange={(v) => form.setBlAchatId(v === "none" ? null : v)}
                      disabled={!form.tiersId}
                    >
                      <SelectTrigger className="h-8 text-sm w-full">
                        <SelectValue placeholder={form.tiersId ? "Sélectionner un BL" : "Sélectionnez d'abord un fournisseur"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Aucun —</SelectItem>
                        {bls.map((bl) => (
                          <SelectItem key={bl.id} value={bl.id}>
                            BL {bl.numero} — {bl.referenceFournisseur ?? (bl.tiers as { raisonSociale?: string })?.raisonSociale ?? ""} — {formatCurrency(bl.totalTTC, "TND")} — {bl.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Le stock a déjà été mis à jour par le BL ; la facture liée ne créera pas de nouvelle entrée de stock.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {scan.extracted && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Données extraites
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {scan.extracted.fournisseur?.raisonSociale && (
                      <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-muted-foreground">Fournisseur</span>
                        <span className="font-medium">{scan.extracted.fournisseur.raisonSociale}</span>
                      </div>
                    )}
                    {scan.extracted.referenceFournisseur && (
                      <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-muted-foreground">N° Facture</span>
                        <span className="font-medium">{scan.extracted.referenceFournisseur}</span>
                      </div>
                    )}
                    {scan.extracted.totalHT != null && (
                      <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-muted-foreground">Total HT</span>
                        <span className="font-medium">{formatCurrency(String(scan.extracted.totalHT), "TND")}</span>
                      </div>
                    )}
                    {scan.extracted.totalTVA != null && (
                      <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-muted-foreground">TVA</span>
                        <span className="font-medium">{formatCurrency(String(scan.extracted.totalTVA), "TND")}</span>
                      </div>
                    )}
                    {scan.extracted.timbreFiscal != null && (
                      <div className="flex justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-muted-foreground">Timbre fiscal</span>
                        <span className="font-medium">{formatCurrency(String(scan.extracted.timbreFiscal), "TND")}</span>
                      </div>
                    )}
                    {scan.extracted.totalTTC != null && (
                      <div className="flex justify-between p-2 rounded-lg bg-muted/50 col-span-2">
                        <span className="text-muted-foreground font-semibold">Total TTC</span>
                        <span className="font-semibold text-emerald-600">{formatCurrency(String(scan.extracted.totalTTC), "TND")}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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
