"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Sparkles, User } from "lucide-react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { filterClientsByName, findSelectedClient } from "./scan-bc-verification-logic"
import type { ScanBCClient, ScanBCExtractedData } from "./scan-bc-verification-logic"

interface ScanBCInfosCardProps {
  referenceBC: string | undefined
  formDate: string
  onFormDate: (v: string) => void
  formDateExpiration: string
  onFormDateExpiration: (v: string) => void
  formRefClient: string
  onFormRefClient: (v: string) => void
}

export function ScanBCInfosCard({
  referenceBC, formDate, onFormDate,
  formDateExpiration, onFormDateExpiration,
  formRefClient, onFormRefClient,
}: ScanBCInfosCardProps) {
  return (
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
            value={referenceBC || "—"}
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
  )
}

interface ScanBCClientCardProps {
  extracted: ScanBCExtractedData
  clients: ScanBCClient[]
  matchedClient: ScanBCClient | undefined
  formTiersId: string
  onFormTiersId: (v: string) => void
  createClient: boolean
  onCreateClient: (v: boolean) => void
}

export function ScanBCClientCard({
  extracted, clients, matchedClient, formTiersId, onFormTiersId,
  createClient, onCreateClient,
}: ScanBCClientCardProps) {
  const [clientSearch, setClientSearch] = useState("")
  const selectedClient = findSelectedClient(clients, formTiersId, matchedClient)
  const filteredClients = filterClientsByName(clients, clientSearch)

  return (
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
  )
}
