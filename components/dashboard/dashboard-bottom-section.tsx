"use client"

import { ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InvoiceStatusBadge } from "@/components/status-badge"
import { formatTND } from "@/lib/decimal"
import Link from "next/link"
import type { SerializedInvoice } from "@/lib/types"

export function BottomSection({
  recentInvoices, topClients, maxCA,
}: {
  recentInvoices: SerializedInvoice[]
  topClients: Record<string, string>[]
  maxCA: number
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 lg:px-6">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Factures Récentes</CardTitle>
            <CardDescription>Les 5 dernières factures</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/factures" className="text-xs flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {recentInvoices.map((inv: SerializedInvoice) => (
                <tr key={inv.id} className="border-t border-border hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-xs">{inv.numero}</p>
                    <p className="text-xs text-muted-foreground">{(inv.tiers as { raisonSociale: string })?.raisonSociale ?? "—"}</p>
                  </td>
                  <td className="px-4 py-2.5"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <p className="text-xs font-semibold tabular-nums">{formatTND(inv.totalTTC)}</p>
                    {parseFloat(inv.resteAPayer) > 0 && <p className="text-xs text-red-500">Reste: {formatTND(inv.resteAPayer)}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Meilleurs Clients</CardTitle>
          <CardDescription>Par chiffre d&apos;affaires</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topClients.map((client: Record<string, string>, idx: number) => {
            const pct = maxCA > 0 ? (parseFloat(client.totalCA) / maxCA) * 100 : 0
            return (
              <div key={client.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0">#{idx + 1}</span>
                    <span className="text-xs font-medium truncate">{client.raisonSociale}</span>
                  </div>
                  <span className="text-xs font-semibold text-right tabular-nums shrink-0 ml-2">{formatTND(client.totalCA)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
