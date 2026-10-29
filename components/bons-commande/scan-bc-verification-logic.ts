import { parseTunisianNumber } from "@/lib/decimal"
import type { ScanBCLine, Product } from "./scan-bc-lines-table"

export interface ScanBCClient {
  id: string
  raisonSociale: string
  ville?: string | null
  matriculeFiscal?: string | null
}

export interface ScanBCExtractedData {
  clientName?: string
  referenceBC?: string
  dateDocument: string
  notes?: string
  lines: ScanBCLine[]
  totalHT: number
  totalTVA: number
  totalTTC: number
}

export type ScanBCLineUpdate = Partial<Omit<ScanBCLine, "id">>

export interface ScanBCVerificationProps {
  extracted: ScanBCExtractedData
  clients: ScanBCClient[]
  matchedClient: ScanBCClient | undefined
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
  onUpdateLine: (id: string, updates: ScanBCLineUpdate) => void
  onAddLine: () => void
  onRemoveLine: (id: string) => void
  onConfirm: () => void
  onSaveDraft: () => void
  onReset: () => void
  isSaving: boolean
}

export function computeRemiseTotale(lines: ScanBCLine[]): number {
  return lines.reduce((total, l) => {
    const prix = parseTunisianNumber(l.prixHT) || 0
    const qte = parseTunisianNumber(l.quantite) || 0
    const remisePct = parseTunisianNumber(l.remise) || 0
    return total + prix * (remisePct / 100) * qte
  }, 0)
}

export function findSelectedClient(
  clients: ScanBCClient[],
  formTiersId: string,
  matchedClient: ScanBCClient | undefined
): ScanBCClient | undefined {
  return clients.find((c) => c.id === (formTiersId || matchedClient?.id))
}

export function filterClientsByName(clients: ScanBCClient[], search: string): ScanBCClient[] {
  return clients.filter((c) => c.raisonSociale.toLowerCase().includes(search.toLowerCase()))
}
