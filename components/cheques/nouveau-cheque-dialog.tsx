"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Checkbox } from "@/components/ui/checkbox"
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

interface NouveauChequeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function makeDefaultForm() {
  return {
    numero: "",
    banque: "",
    type: "RECU" as "RECU" | "EMIS",
    tiersId: "",
    invoiceId: "",
    beneficiaire: "",
    montant: "",
    dateReception: new Date().toISOString().split("T")[0],
    dateEncaissement: "",
    banqueBeneficiaire: "",
    isPaye: false,
    notes: "",
  }
}

type ChequeForm = ReturnType<typeof makeDefaultForm>

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

  const handleTypeChange = (type: "RECU" | "EMIS") => {
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

  const handleInvoiceSelect = (docId: string) => {
    const doc = documents.find((d) => d.id === docId)
    if (doc) {
      set("invoiceId", doc.id)
      set("montant", doc.resteAPayer ?? doc.totalTTC)
    }
  }

  const filteredClients = clients.filter((c) =>
    c.raisonSociale.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.code.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const filteredFournisseurs = fournisseurs.filter((f) =>
    f.raisonSociale.toLowerCase().includes(clientSearch.toLowerCase()) ||
    f.code.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const handleSubmit = async () => {
    if (!form.numero || !beneficiaire || !form.montant || !form.dateReception) {
      notify.error({ title: "Chèque non enregistré", error: "Remplissez tous les champs obligatoires : numéro, bénéficiaire, montant et date de réception." })
      return
    }

    if (form.type === "RECU" && !form.tiersId) {
      notify.error({ title: "Client requis", error: "Sélectionnez le client émetteur du chèque reçu." })
      return
    }

    if (form.type === "EMIS" && !form.tiersId) {
      notify.error({ title: "Fournisseur requis", error: "Sélectionnez le fournisseur bénéficiaire du chèque émis." })
      return
    }

    try {
      await createCheque.mutateAsync({
        numero: form.numero,
        banque: form.banque || undefined,
        type: form.type,
        tiersId: form.tiersId || undefined,
        invoiceId: form.invoiceId || undefined,
        beneficiaire,
        montant: parseFloat(form.montant),
        dateEmission: form.dateReception,
        dateEcheance: form.dateEncaissement || form.dateReception,
        banqueBeneficiaire: form.banqueBeneficiaire || undefined,
        notes: form.notes || undefined,
      })
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
            <Select value={form.type} onValueChange={(v) => handleTypeChange(v as "RECU" | "EMIS")}>
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
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Client (Tireur) *</Label>
              <Input
                placeholder="Rechercher un client..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value)
                  if (!e.target.value) {
                    setSelectedTiers(null)
                    set("tiersId", "")
                  }
                }}
                className="h-8 text-sm"
              />
              {clientSearch && !selectedTiers && (
                <div className="max-h-32 overflow-y-auto border rounded-md bg-background">
                  {filteredClients.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">Aucun client trouvé</p>
                  ) : (
                    filteredClients.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                        onClick={() => handleTiersSelect(c)}
                      >
                        <p className="font-medium">{c.raisonSociale}</p>
                        <p className="text-muted-foreground">{c.code} · {c.ville ?? "—"}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedTiers && (
                <div className="text-xs text-muted-foreground">
                  Sélectionné : <span className="font-medium text-foreground">{selectedTiers.raisonSociale}</span>
                  <button
                    type="button"
                    className="ml-2 text-destructive hover:underline"
                    onClick={() => {
                      setSelectedTiers(null)
                      set("tiersId", "")
                      setClientSearch("")
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Supplier selection for EMIS type */}
          {form.type === "EMIS" && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Fournisseur (Bénéficiaire) *</Label>
              <Input
                placeholder="Rechercher un fournisseur..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value)
                  if (!e.target.value) {
                    setSelectedTiers(null)
                    set("tiersId", "")
                  }
                }}
                className="h-8 text-sm"
              />
              {clientSearch && !selectedTiers && (
                <div className="max-h-32 overflow-y-auto border rounded-md bg-background">
                  {filteredFournisseurs.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-2">Aucun fournisseur trouvé</p>
                  ) : (
                    filteredFournisseurs.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                        onClick={() => handleTiersSelect(f)}
                      >
                        <p className="font-medium">{f.raisonSociale}</p>
                        <p className="text-muted-foreground">{f.code} · {f.ville ?? "—"}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
              {selectedTiers && (
                <div className="text-xs text-muted-foreground">
                  Sélectionné : <span className="font-medium text-foreground">{selectedTiers.raisonSociale}</span>
                  <button
                    type="button"
                    className="ml-2 text-destructive hover:underline"
                    onClick={() => {
                      setSelectedTiers(null)
                      set("tiersId", "")
                      setClientSearch("")
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
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
              onChange={(e) => {
                // Strip non-numeric chars except . and ,
                const raw = e.target.value.replace(/[^\d.,]/g, "").replace(",", ".")
                set("montant", raw)
              }}
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
