"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FileText, Sparkles, Tag } from "lucide-react"
import { formatCurrency } from "@/lib/decimal"
import { ACHAT_CATEGORIE_LABELS, type ExtractedData } from "@/lib/stores/achats-store"
import type { AchatCategorie, AchatType, SerializedAchat } from "@/lib/types"

export function ScanVerifDocumentPreview({ previewUrl, fileName }: { previewUrl: string | null; fileName: string }) {
  return (
    <div className="col-span-2">
      <Card className="sticky top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            Document original
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {previewUrl && (
            fileName.endsWith(".pdf") ? (
              <iframe src={previewUrl} className="w-full h-[600px] rounded-b-lg" title="Document" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- refactor lot I : rendu strictement identique à l'implémentation d'origine (migration next/image hors périmètre)
              <img src={previewUrl} alt="Document scanné" loading="lazy" className="w-full object-contain rounded-b-lg max-h-[600px]" />
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function ScanVerifCreateFournisseurNotice({
  raisonSociale,
  checked,
  onCheckedChange,
}: {
  raisonSociale: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="flex items-start gap-2 text-sm text-amber-800">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <span>
          Fournisseur introuvable — il sera créé automatiquement :{" "}
          <strong>{raisonSociale}</strong>
        </span>
      </p>
      <label className="flex items-center gap-2 text-xs text-amber-800 cursor-pointer">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
        />
        Créer le fournisseur automatiquement
      </label>
    </div>
  )
}

interface ScanVerifClassificationProps {
  type: AchatType
  tiersId: string
  categorieAchat: AchatCategorie | null
  blAchatId: string | null
  bls: SerializedAchat[]
  onCategorieChange: (c: AchatCategorie | null) => void
  onBlChange: (id: string | null) => void
}

export function ScanVerifClassification({
  type, tiersId, categorieAchat, blAchatId, bls,
  onCategorieChange, onBlChange,
}: ScanVerifClassificationProps) {
  return (
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
            value={categorieAchat ?? ""}
            onValueChange={(v) => onCategorieChange(v === "" ? null : (v as AchatCategorie))}
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
        {type === "FACTURE" && (
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Rattacher au BL d&apos;achat</Label>
            <Select
              value={blAchatId ?? "none"}
              onValueChange={(v) => onBlChange(v === "none" ? null : v)}
              disabled={!tiersId}
            >
              <SelectTrigger className="h-8 text-sm w-full">
                <SelectValue placeholder={tiersId ? "Sélectionner un BL" : "Sélectionnez d'abord un fournisseur"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Aucun —</SelectItem>
                {bls.map((bl) => (
                  <SelectItem key={bl.id} value={bl.id}>
                    BL {bl.numero} — {bl.referenceFournisseur ?? bl.tiers?.raisonSociale ?? ""} — {formatCurrency(bl.totalTTC, "TND")} — {bl.status}
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
  )
}

function ExtractedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between p-2 rounded-lg bg-muted/50">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function ScanVerifExtractedData({ extracted }: { extracted: ExtractedData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Données extraites
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <div className="grid grid-cols-2 gap-3 text-xs">
          {extracted.fournisseur?.raisonSociale && (
            <ExtractedField label="Fournisseur" value={extracted.fournisseur.raisonSociale} />
          )}
          {extracted.referenceFournisseur && (
            <ExtractedField label="N° Facture" value={extracted.referenceFournisseur} />
          )}
          {extracted.totalHT != null && (
            <ExtractedField label="Total HT" value={formatCurrency(String(extracted.totalHT), "TND")} />
          )}
          {extracted.totalTVA != null && (
            <ExtractedField label="TVA" value={formatCurrency(String(extracted.totalTVA), "TND")} />
          )}
          {extracted.timbreFiscal != null && (
            <ExtractedField label="Timbre fiscal" value={formatCurrency(String(extracted.timbreFiscal), "TND")} />
          )}
          {extracted.totalTTC != null && (
            <div className="flex justify-between p-2 rounded-lg bg-muted/50 col-span-2">
              <span className="text-muted-foreground font-semibold">Total TTC</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(String(extracted.totalTTC), "TND")}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
