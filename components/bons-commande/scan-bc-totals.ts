import { parseTunisianNumber } from "@/lib/decimal"

export interface BCManualLine {
  id: string
  productId: string | null
  createProduct: boolean
  description: string
  quantite: string
  prixHT: string
  remise: string
  tauxTVA: string
  fodec: boolean
  tauxFodec: string
  totalHT: string
  typeSource: "PRODUCTION" | "STOCK"
}

export interface BCLineTotals {
  lineHT: number
  remiseAmount: number
  totalHT: number
}

export interface BCTotals {
  baseHT: number
  totalRemise: number
  totalHT: number
  totalTVA: number
  totalFodec: number
  totalTTC: number
}

export const BC_TIMBRE_FISCAL = 1.000

export function computeBCLineTotals(line: BCManualLine): BCLineTotals {
  const prix = parseTunisianNumber(line.prixHT) || 0
  const qte = parseTunisianNumber(line.quantite) || 0
  const remisePct = parseTunisianNumber(line.remise) || 0

  const lineHT = prix * qte
  const remiseAmount = lineHT * (remisePct / 100)

  return { lineHT, remiseAmount, totalHT: lineHT - remiseAmount }
}

export function computeBCTotals(lines: BCManualLine[]): BCTotals {
  let baseHT = 0
  let totalRemise = 0
  let totalTVA = 0
  let totalFodec = 0

  for (const line of lines) {
    const tauxTVA = Number(line.tauxTVA) || 0
    const tauxFodec = Number(line.tauxFodec) || 1
    const { lineHT, remiseAmount, totalHT } = computeBCLineTotals(line)

    const lineTVA = totalHT * (tauxTVA / 100)
    const lineFodec = totalHT * (line.fodec ? tauxFodec / 100 : 0)

    baseHT += lineHT
    totalRemise += remiseAmount
    totalTVA += lineTVA
    totalFodec += lineFodec
  }

  const totalHT = baseHT - totalRemise
  const totalTTC = totalHT + totalTVA + totalFodec + BC_TIMBRE_FISCAL

  return { baseHT, totalRemise, totalHT, totalTVA, totalFodec, totalTTC }
}
