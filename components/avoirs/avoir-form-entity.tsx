"use client"

import { useState } from "react"
import { useAvoirFormStore } from "@/lib/stores/avoirs-store"
import { useClients, useFournisseurs, useInvoices } from "@/hooks/use-queries"
import type { SerializedTiers, SerializedInvoice } from "@/lib/types"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

export function AvoirFormEntity() {
  const [entityTab, setEntityTab] = useState<string>("client")
  const form = useAvoirFormStore()
  const { data: clientsData } = useClients()
  const { data: fournisseursData } = useFournisseurs()
  const { data: invoicesData } = useInvoices()
  const clients = clientsData?.clients ?? []
  const fournisseurs = fournisseursData?.fournisseurs ?? []
  const selectedClient = clients.find((c) => c.id === form.tiersId)
  const selectedFournisseur = fournisseurs.find(
    (f): f is { id: string; raisonSociale: string } => f.id === form.tiersId
  )

  const invoices = (invoicesData?.invoices ?? []).filter(
    (inv: { tiersId: string; status: string }) =>
      inv.tiersId === form.tiersId && inv.status !== "ANNULEE"
  )
  const selectedInvoice = invoices.find((inv: { id: string }) => inv.id === form.invoiceId)

  const filteredClients = clients.filter((c) =>
    c.raisonSociale.toLowerCase().includes(form.tiersSearch.toLowerCase())
  )
  const filteredFournisseurs = fournisseurs.filter(
    (f): f is { id: string; raisonSociale: string } =>
      (f as { raisonSociale: string }).raisonSociale.toLowerCase().includes(form.tiersSearch.toLowerCase())
  )
  const filteredInvoices = invoices.filter(
    (inv: { numero: string }) =>
      inv.numero.toLowerCase().includes(form.invoiceSearch.toLowerCase())
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {form.type === "SIMPLE" ? "Client" : "Client / Fournisseur"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {form.type === "SIMPLE" ? (
          <>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Client</Label>
              <Combobox
                value={selectedClient || null}
                onValueChange={(c: SerializedTiers | null) => { form.setTiersId(c?.id ?? ""); form.setInvoiceId("") }}
                  onInputValueChange={form.setTiersSearch}
                  itemToStringLabel={(c: SerializedTiers | null) => c?.raisonSociale ?? ""}
                >
                  <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher un client..." />
                  <ComboboxContent>
                    <ComboboxEmpty>Aucun client trouvé.</ComboboxEmpty>
                    <ComboboxList>
                      {filteredClients.map((c) => (
                        <ComboboxItem key={c.id} value={c}>{c.raisonSociale}</ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              {selectedClient && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Facture</Label>
                  <Combobox
                  value={selectedInvoice || null}
                  onValueChange={(inv: SerializedInvoice | null) => form.setInvoiceId(inv?.id ?? "")}
                  onInputValueChange={form.setInvoiceSearch}
                  itemToStringLabel={(inv: SerializedInvoice | null) => inv?.numero ?? ""}
                >
                  <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher une facture..." />
                  <ComboboxContent>
                    <ComboboxEmpty>Aucune facture trouvée.</ComboboxEmpty>
                    <ComboboxList>
                      {filteredInvoices.map((inv: { id: string; numero: string }) => (
                        <ComboboxItem key={inv.id} value={inv}>{inv.numero}</ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            )}
            {selectedClient && (
              <div className="p-2.5 rounded-lg bg-muted/50 text-xs flex flex-col gap-1">
                <p className="font-semibold">{selectedClient.raisonSociale}</p>
                {selectedClient.matriculeFiscal && (
                  <p className="text-muted-foreground font-mono">MF: {selectedClient.matriculeFiscal}</p>
                )}
                <div className="flex gap-1 pt-0.5">
                  {selectedClient.assujettTVA && !selectedClient.exonereTVA && (
                    <Badge variant="outline" className="text-xs py-0">TVA</Badge>
                  )}
                  {selectedClient.exonereTVA && (
                    <Badge variant="outline" className="text-xs py-0">Exonéré TVA</Badge>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <Tabs value={entityTab} onValueChange={(v) => {
              setEntityTab(v)
              form.setTiersId("")
            }}>
              <TabsList className="h-8">
                <TabsTrigger value="client" className="text-xs">Client</TabsTrigger>
                <TabsTrigger value="fournisseur" className="text-xs">Fournisseur</TabsTrigger>
              </TabsList>
            </Tabs>
            {entityTab === "client" ? (
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Client</Label>
                <Combobox
                  value={selectedClient || null}
                  onValueChange={(c: SerializedTiers | null) => form.setTiersId(c?.id ?? "")}
                  onInputValueChange={form.setTiersSearch}
                  itemToStringLabel={(c: SerializedTiers | null) => c?.raisonSociale ?? ""}
                >
                  <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher un client..." />
                  <ComboboxContent>
                    <ComboboxEmpty>Aucun client trouvé.</ComboboxEmpty>
                    <ComboboxList>
                      {filteredClients.map((c) => (
                        <ComboboxItem key={c.id} value={c}>{c.raisonSociale}</ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Fournisseur</Label>
                <Combobox
                  value={selectedFournisseur || null}
                  onValueChange={(f: { id: string; raisonSociale: string } | null) => form.setTiersId(f?.id ?? "")}
                  onInputValueChange={form.setTiersSearch}
                  itemToStringLabel={(f: { id: string; raisonSociale: string } | null) => f?.raisonSociale ?? ""}
                >
                  <ComboboxInput className="h-8 text-sm w-full" placeholder="Chercher un fournisseur..." />
                  <ComboboxContent>
                    <ComboboxEmpty>Aucun fournisseur trouvé.</ComboboxEmpty>
                    <ComboboxList>
                      {filteredFournisseurs.map((f) => (
                        <ComboboxItem key={f.id} value={f}>{f.raisonSociale}</ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
