"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, User } from "lucide-react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

export interface Client {
  id: string
  raisonSociale: string
  ville?: string | null
  matriculeFiscal?: string | null
}

interface ScanBCFormCardsProps {
  clients: Client[]
  formTiersId: string
  onFormTiersId: (v: string) => void
  formDate: string
  onFormDate: (v: string) => void
  formDateExpiration: string
  onFormDateExpiration: (v: string) => void
  formRefClient: string
  onFormRefClient: (v: string) => void
}

export function ScanBCFormCards({
  clients,
  formTiersId, onFormTiersId,
  formDate, onFormDate,
  formDateExpiration, onFormDateExpiration,
  formRefClient, onFormRefClient,
}: ScanBCFormCardsProps) {
  const [clientSearch, setClientSearch] = useState("")

  const selectedClient = clients.find((c) => c.id === formTiersId)
  const filteredClients = clients.filter((c) =>
    c.raisonSociale.toLowerCase().includes(clientSearch.toLowerCase())
  )

  return (
    <>
      {/* Card Informations BC */}
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
              value="BC — auto-généré"
              disabled
              className="h-8 text-sm bg-muted text-muted-foreground"
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

      {/* Card Client */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <User className="h-4 w-4" />
            Client
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Sélectionner un client</Label>
            <Combobox
              value={selectedClient || null}
              onValueChange={(c) => onFormTiersId(c ? c.id : "")}
              onInputValueChange={setClientSearch}
              itemToStringLabel={(c) => (c ? c.raisonSociale : "")}
            >
              <ComboboxInput className="h-8 text-sm w-full" placeholder="Rechercher un client..." />
              <ComboboxContent>
                <ComboboxEmpty>Aucun client trouvé.</ComboboxEmpty>
                <ComboboxList>
                  {filteredClients.map((c) => (
                    <ComboboxItem key={c.id} value={c}>
                      {c.raisonSociale}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          {selectedClient && (
            <div className="p-2.5 rounded-lg bg-muted/50 text-xs space-y-1">
              <p className="font-semibold">{selectedClient.raisonSociale}</p>
              {selectedClient.matriculeFiscal && (
                <p className="text-muted-foreground font-mono">
                  MF: {selectedClient.matriculeFiscal}
                </p>
              )}
              {selectedClient.ville && (
                <p className="text-muted-foreground">{selectedClient.ville}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
