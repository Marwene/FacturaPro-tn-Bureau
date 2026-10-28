"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatTND } from "@/lib/decimal"
import type { SerializedCompanyBankAccount, SerializedTiers } from "@/lib/types"
import { filterTiers, sanitizeMontantInput, type ChequeForm } from "./cheque-form-logic"

interface TiersSearchSelectProps {
  label: string
  placeholder: string
  emptyLabel: string
  items: SerializedTiers[]
  search: string
  onSearchChange: (value: string) => void
  selected: SerializedTiers | null
  onSelect: (tiers: SerializedTiers) => void
  onClear: () => void
}

export function TiersSearchSelect({
  label,
  placeholder,
  emptyLabel,
  items,
  search,
  onSearchChange,
  selected,
  onSelect,
  onClear,
}: TiersSearchSelectProps) {
  const filtered = filterTiers(items, search)
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-8 text-sm"
      />
      {search && !selected && (
        <div className="max-h-32 overflow-y-auto border rounded-md bg-background">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">{emptyLabel}</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                onClick={() => onSelect(item)}
              >
                <p className="font-medium">{item.raisonSociale}</p>
                <p className="text-muted-foreground">{item.code} · {item.ville ?? "—"}</p>
              </button>
            ))
          )}
        </div>
      )}
      {selected && (
        <div className="text-xs text-muted-foreground">
          Sélectionné : <span className="font-medium text-foreground">{selected.raisonSociale}</span>
          <button
            type="button"
            className="ml-2 text-destructive hover:underline"
            onClick={onClear}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

interface ChequeBasicFieldsProps {
  form: ChequeForm
  set: (field: string, value: string | boolean) => void
  selectedTiers: SerializedTiers | null
  companyName: string
  bankAccounts: SerializedCompanyBankAccount[]
}

export function ChequeBasicFields({ form, set, selectedTiers, companyName, bankAccounts }: ChequeBasicFieldsProps) {
  return (
    <>
      {/* N° Chèque */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">N° Chèque *</Label>
        <Input
          value={form.numero}
          onChange={(e) => set("numero", e.target.value)}
          placeholder="N° du chèque"
          className="h-8 text-sm"
        />
      </div>

      {/* Bénéficiaire */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Bénéficiaire *</Label>
        {form.type === "RECU" ? (
          <Input
            value={companyName}
            readOnly
            className="h-8 text-sm bg-muted"
          />
        ) : (
          <Input
            value={form.beneficiaire}
            onChange={(e) => set("beneficiaire", e.target.value)}
            placeholder="Nom du fournisseur"
            className="h-8 text-sm"
          />
        )}
      </div>

      {/* Montant */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Montant (DT) *</Label>
        <Input
          type="text"
          inputMode="decimal"
          value={form.montant ? formatTND(form.montant) : ""}
          onChange={(e) => set("montant", sanitizeMontantInput(e.target.value))}
          placeholder="0,000 DT"
          className="h-8 text-sm"
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Date Réception *</Label>
          <Input
            type="date"
            value={form.dateReception}
            onChange={(e) => set("dateReception", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Date Encaissement</Label>
          <Input
            type="date"
            value={form.dateEncaissement}
            onChange={(e) => set("dateEncaissement", e.target.value)}
            placeholder="À compléter ultérieurement"
            className="h-8 text-sm"
          />
          <p className="text-[10px] text-muted-foreground">Peut être mise à jour ultérieurement</p>
        </div>
      </div>

      {/* Banque Émettrice — auto-filled from client or manual */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Banque Émettrice</Label>
        <Input
          value={form.banque}
          onChange={(e) => set("banque", e.target.value)}
          placeholder={selectedTiers?.banque ? "Rempli automatiquement" : "Saisir la banque émettrice"}
          className="h-8 text-sm"
        />
        {selectedTiers?.banque && (
          <p className="text-[10px] text-muted-foreground">Rempli depuis la banque du client sélectionné</p>
        )}
      </div>

      {/* Banque Bénéficiaire — list of company bank accounts */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Banque Bénéficiaire</Label>
        {bankAccounts.length > 0 ? (
          <Select value={form.banqueBeneficiaire} onValueChange={(v) => set("banqueBeneficiaire", v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Sélectionner une banque" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts.map((ba) => (
                <SelectItem key={ba.id} value={ba.nomBanque}>
                  {ba.nomBanque}{ba.agence ? ` — ${ba.agence}` : ""}{ba.isDefault ? " (par défaut)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={form.banqueBeneficiaire}
            onChange={(e) => set("banqueBeneficiaire", e.target.value)}
            placeholder="Aucun compte bancaire configuré"
            className="h-8 text-sm"
          />
        )}
        <p className="text-[10px] text-muted-foreground">Peut être ajoutée ultérieurement</p>
      </div>

      {/* Statut */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="isPaye"
          checked={form.isPaye}
          onCheckedChange={(checked) => set("isPaye", checked === true)}
        />
        <Label htmlFor="isPaye" className="text-xs cursor-pointer">
          Chèque encaissé / Payé
        </Label>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Informations complémentaires..."
          className="text-sm min-h-[60px] resize-y"
        />
      </div>
    </>
  )
}
