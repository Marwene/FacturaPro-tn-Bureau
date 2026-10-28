"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useChequesMutations } from "@/hooks/use-cheques"
import { useClientsList } from "@/hooks/use-clients"
import { useFournisseursList } from "@/hooks/use-fournisseurs"
import { useCompany } from "@/hooks/use-company-query"
import { useActiveCompanyId } from "@/hooks/use-active-company"
import { useCompanyBankAccounts, useDocumentsLies } from "@/hooks/use-effets"
import { notify } from "@/lib/notify"
import { Loader2 } from "lucide-react"
import { formatTND } from "@/lib/decimal"
import type { SerializedTiers } from "@/lib/types"
import { ChequeBasicFields, TiersSearchSelect } from "./cheque-form-fields"
import {
  buildCreateChequePayload,
  makeDefaultForm,
  validateChequeForm,
  type ChequeForm,
  type ChequeType,
} from "./cheque-form-logic"

interface NouveauChequeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NouveauChequeDialog({ open, onOpenChange }: NouveauChequeDialogProps) {
  const [form, setForm] = useState<ChequeForm>(makeDefaultForm)
  const [selectedTiers, setSelectedTiers] = useState<SerializedTiers | null>(null)
  const [clientSearch, setClientSearch] = useState("")
  const { createCheque } = useChequesMutations()
  const { data: clientsData } = useClientsList()
  const { data: fournisseursData } = useFournisseursList()
  const companyId = useActiveCompanyId()
  const { data: companyData } = useCompany(companyId)
  const clients = clientsData?.clients ?? []
  const fournisseurs = fournisseursData?.fournisseurs ?? []
  const companyName = companyData?.company?.name ?? ""
  const { data: bankAccountsData } = useCompanyBankAccounts()
  const bankAccounts = bankAccountsData?.accounts ?? []

  // Factures impayées du client sélectionné (hook partagé effets/chèques)
  const { data: docsData } = useDocumentsLies({
    type: form.type,
    entityId: form.tiersId,
    enabled: !!form.tiersId && form.type === "RECU",
  })
  const documents = docsData?.documents ?? []

  // For RECU, beneficiaire is always the active company; for EMIS, it's user-entered
  const beneficiaire = form.type === "RECU" ? companyName : form.beneficiaire

  const set = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleTypeChange = (type: ChequeType) => {
    setForm(makeDefaultForm())
    setSelectedTiers(null)
    setClientSearch("")
    // Set default type after reset
    setForm((prev) => ({ ...prev, type }))
  }

  const handleTiersSelect = (tiers: SerializedTiers) => {
    setSelectedTiers(tiers)
    set("tiersId", tiers.id)
    setClientSearch(tiers.raisonSociale)
    // Auto-fill banque émettrice with client's bank
    if (tiers.banque) {
      set("banque", tiers.banque)
    }
  }

  const handleTiersSearchChange = (value: string) => {
    setClientSearch(value)
    if (!value) {
      setSelectedTiers(null)
      set("tiersId", "")
    }
  }

  const handleTiersClear = () => {
    setSelectedTiers(null)
    set("tiersId", "")
    setClientSearch("")
  }

  const handleInvoiceSelect = (docId: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (doc) {
      set("invoiceId", doc.id)
      set("montant", doc.resteAPayer ?? doc.totalTTC)
    }
  }

  const handleSubmit = async () => {
    const validationError = validateChequeForm(form, beneficiaire)
    if (validationError) {
      notify.error({ title: validationError.title, error: validationError.message })
      return
    }

    try {
      await createCheque.mutateAsync(buildCreateChequePayload(form, beneficiaire))
      notify.success({ title: `Chèque ${form.numero} créé` })
      setForm(makeDefaultForm())
      setSelectedTiers(null)
      setClientSearch("")
      onOpenChange(false)
    } catch (err) {
      notify.error({ title: "Chèque non créé", error: err, context: "création du chèque" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Nouveau Chèque</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          {/* Type */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Type *</Label>
            <Select value={form.type} onValueChange={(v) => handleTypeChange(v as ChequeType)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECU">Reçu (du client)</SelectItem>
                <SelectItem value="EMIS">Émis (fournisseur)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Client selection for RECU type */}
          {form.type === "RECU" && (
            <TiersSearchSelect
              label="Client (Tireur) *"
              placeholder="Rechercher un client..."
              emptyLabel="Aucun client trouvé"
              items={clients}
              search={clientSearch}
              onSearchChange={handleTiersSearchChange}
              selected={selectedTiers}
              onSelect={handleTiersSelect}
              onClear={handleTiersClear}
            />
          )}

          {/* Supplier selection for EMIS type */}
          {form.type === "EMIS" && (
            <TiersSearchSelect
              label="Fournisseur (Bénéficiaire) *"
              placeholder="Rechercher un fournisseur..."
              emptyLabel="Aucun fournisseur trouvé"
              items={fournisseurs}
              search={clientSearch}
              onSearchChange={handleTiersSearchChange}
              selected={selectedTiers}
              onSelect={handleTiersSelect}
              onClear={handleTiersClear}
            />
          )}

          {/* Invoice selection for RECU type */}
          {form.type === "RECU" && form.tiersId && documents.length > 0 && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Facture liée</Label>
              <Select onValueChange={handleInvoiceSelect}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Sélectionner une facture" />
                </SelectTrigger>
                <SelectContent>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.numero} — {formatTND(doc.resteAPayer ?? doc.totalTTC)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ChequeBasicFields
            form={form}
            set={set}
            selectedTiers={selectedTiers}
            companyName={companyName}
            bankAccounts={bankAccounts}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={createCheque.isPending}>
            {createCheque.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Création...
              </>
            ) : (
              "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
