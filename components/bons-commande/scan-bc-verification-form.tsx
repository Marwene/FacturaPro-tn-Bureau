"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { FileText, Loader2, Sparkles, X, User } from "lucide-react"
import { parseTunisianNumber, formatCurrency } from "@/lib/decimal"
import { notify } from "@/lib/notify"
import { ScanBCLinesTable, type ScanBCLine, type Product } from "./scan-bc-lines-table"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

interface Client {
  id: string
  raisonSociale: string
  ville?: string | null
  matriculeFiscal?: string | null
}

interface ExtractedData {
  clientName?: string
  referenceBC?: string
  dateDocument: string
  notes?: string
  lines: ScanBCLine[]
  totalHT: number
  totalTVA: number
  totalTTC: number
}

type LineUpdate = Partial<Omit<ScanBCLine, "id">>

interface Props {
  extracted: ExtractedData
  clients: Client[]
  matchedClient: Client | undefined
  formTiersId: string
  onFormTiersId: (v: string) => void
  formDate: string
  onFormDate: (v: string) => void
  formNotes: string
  onFormNotes: (v: string) => void
  formRefClient: string
  onFormRefClient: (v: string) => void
  formDateExpiration: string
  onFormDateExpiration: (v: string) => void
  createClient: boolean
  onCreateClient: (v: boolean) => void
  totalHT: string
  onTotalHT: (v: string) => void
  totalTVA: string
  onTotalTVA: (v: string) => void
  totalTTC: string
  onTotalTTC: (v: string) => void
  timbreFiscal: string
  onTimbreFiscal: (v: string) => void
  products: Product[]
  onUpdateLine: (id: string, updates: LineUpdate) => void
  onAddLine: () => void
  onRemoveLine: (id: string) => void
  onConfirm: () => void
  onSaveDraft: () => void
  onReset: () => void
  isSaving: boolean
}

function MoneyInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false)
  const displayValue = focused ? value : formatCurrency(value, "TND")
  return (
    <Input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-28 text-right text-xs tabular-nums"
    />
  )
}

function computeRemiseTotale(lines: ScanBCLine[]): number {
  return lines.reduce((total, l) => {
    const prix = parseTunisianNumber(l.prixHT) || 0
    const qte = parseTunisianNumber(l.quantite) || 0
    const remisePct = parseTunisianNumber(l.remise) || 0
    return total + prix * (remisePct / 100) * qte
  }, 0)
}

export function ScanBCVerificationForm({
  extracted, clients, matchedClient, formTiersId, onFormTiersId,
  formDate, onFormDate, formNotes, onFormNotes,
  formRefClient, onFormRefClient, formDateExpiration, onFormDateExpiration,
  createClient, onCreateClient,
  totalHT, onTotalHT, totalTVA, onTotalTVA, totalTTC, onTotalTTC,
  timbreFiscal, onTimbreFiscal,
  products, onUpdateLine, onAddLine, onRemoveLine,
  onConfirm, onSaveDraft, onReset, isSaving,
}: Props) {
  const [clientSearch, setClientSearch] = useState("")
  const selectedClient = clients.find((c) => c.id === (formTiersId || matchedClient?.id))
  const filteredClients = clients.filter((c) =>
    c.raisonSociale.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const handleConfirm = () => {
    if (!formTiersId && !(createClient && extracted.clientName)) {
      notify.warning({
        title: "Client non renseigné",
        description: "Sélectionnez un client ou cochez la création automatique du client détecté.",
      })
      return
    }
    onConfirm()
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Informations Bon de Commande
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">N° BC</Label>
              <Input
                value={extracted.referenceBC || "—"}
                disabled
                className="h-8 text-sm bg-muted/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Date création</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => onFormDate(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Date expiration</Label>
              <Input
                type="date"
                value={formDateExpiration}
                onChange={(e) => onFormDateExpiration(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Référence client</Label>
              <Input
                value={formRefClient}
                onChange={(e) => onFormRefClient(e.target.value)}
                className="h-8 text-sm"
                placeholder="Référence du document client"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!formTiersId && !matchedClient && extracted.clientName && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="flex items-start gap-2 text-sm text-amber-800">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Client introuvable — il sera créé automatiquement :{" "}
                    <strong>{extracted.clientName}</strong>
                  </span>
                </p>
                <label className="flex items-center gap-2 text-xs text-amber-800 cursor-pointer">
                  <Checkbox
                    checked={createClient}
                    onCheckedChange={(v) => onCreateClient(v === true)}
                  />
                  Créer le client automatiquement
                </label>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <Label className="text-xs">Client *</Label>
              <Combobox
                value={selectedClient || null}
                onValueChange={(c) => onFormTiersId(c ? c.id : "")}
                onInputValueChange={setClientSearch}
                itemToStringLabel={(c) => (c ? c.raisonSociale : "")}
              >
                <ComboboxInput className="h-8 text-sm w-full" placeholder="Rechercher un client..." />
                <ComboboxContent>
                  <ComboboxEmpty>Aucun client.</ComboboxEmpty>
                  <ComboboxList>
                    {filteredClients.map((c) => (
                      <ComboboxItem key={c.id} value={c}>
                        <span>{c.raisonSociale}</span>
                        {c.raisonSociale.toLowerCase() === extracted.clientName?.toLowerCase() && (
                          <span className="ml-1 text-green-600">✓</span>
                        )}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>

            {selectedClient && (
              <div className="rounded-lg bg-muted/50 p-2 text-xs space-y-1">
                {selectedClient.matriculeFiscal && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MF</span>
                    <span className="font-medium">{selectedClient.matriculeFiscal}</span>
                  </div>
                )}
                {selectedClient.ville && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ville</span>
                    <span className="font-medium">{selectedClient.ville}</span>
                  </div>
                )}
              </div>
            )}

            {matchedClient && !formTiersId && (
              <p className="text-xs text-green-600">
                Client détecté automatiquement : {matchedClient.raisonSociale}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <ScanBCLinesTable
        lines={extracted.lines}
        products={products}
        onAddLine={onAddLine}
        onRemoveLine={onRemoveLine}
        onUpdateLine={onUpdateLine}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Notes et Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formNotes}
              onChange={(e) => onFormNotes(e.target.value)}
              rows={3}
              placeholder="Instructions ou remarques du client..."
              className="text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Base HT</span>
              <MoneyInput value={totalHT} onChange={onTotalHT} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Remise totale</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatCurrency(String(computeRemiseTotale(extracted.lines)), "TND")}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Total HT</span>
              <MoneyInput value={totalHT} onChange={onTotalHT} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">TVA</span>
              <MoneyInput value={totalTVA} onChange={onTotalTVA} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Timbre fiscal</span>
              <MoneyInput value={timbreFiscal} onChange={onTimbreFiscal} />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Total TTC</span>
              <MoneyInput value={totalTTC} onChange={onTotalTTC} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onReset} className="gap-1.5">
          <X className="h-3.5 w-3.5" /> Annuler
        </Button>
        <Button variant="secondary" onClick={onSaveDraft} disabled={isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Brouillon
        </Button>
        <Button onClick={handleConfirm} disabled={isSaving} className="gap-1.5">
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Confirmer
        </Button>
      </div>
    </div>
  )
}
