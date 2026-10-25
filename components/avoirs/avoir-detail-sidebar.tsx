"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTND } from "@/lib/decimal"
import type { SerializedAvoir, SerializedTiers } from "@/lib/types"

export function AvoirDetailSidebar({ tiers, avoir }: { tiers: SerializedTiers | null | undefined; avoir: SerializedAvoir }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Tiers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          {tiers ? (
            <>
              <p className="font-semibold">{tiers.raisonSociale}</p>
              {tiers.matriculeFiscal && <p className="text-xs text-muted-foreground font-mono">MF: {tiers.matriculeFiscal}</p>}
              {tiers.adresse && <p className="text-xs text-muted-foreground">{tiers.adresse}</p>}
              {tiers.ville && <p className="text-xs text-muted-foreground">{tiers.ville}</p>}
              {tiers.telephone && <p className="text-xs text-muted-foreground">{tiers.telephone}</p>}
              {tiers.email && <p className="text-xs text-muted-foreground">{tiers.email}</p>}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Récapitulatif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: "Base HT", value: avoir.baseHT },
            { label: "Total HT", value: avoir.totalHT },
            { label: "TVA", value: avoir.totalTVA },
            ...(parseFloat(avoir.totalFodec) > 0 ? [{ label: "FODEC", value: avoir.totalFodec }] : []),
            { label: "Total TTC", value: avoir.totalTTC, bold: true },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center">
              <span className={`text-xs ${row.bold ? "font-semibold" : "text-muted-foreground"}`}>{row.label}</span>
              <span className={`text-xs ${row.bold ? "font-bold" : ""}`}>{formatTND(row.value)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
