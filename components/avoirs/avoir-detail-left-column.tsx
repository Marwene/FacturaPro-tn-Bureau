"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatTND, formatCurrency } from "@/lib/decimal"
import { formatDate } from "@/lib/utils"
import type { SerializedAvoir, SerializedAvoirLine, SerializedMouvementFinancier, SerializedPayment } from "@/lib/types"

export function AvoirDetailLeftColumn({ avoir, lines, payments, mouvements }: { avoir: SerializedAvoir; lines: SerializedAvoirLine[]; payments: SerializedPayment[]; mouvements: SerializedMouvementFinancier[] }) {
  return (
    <div className="col-span-2 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Date émission</span>
            <span className="text-xs font-medium">{formatDate(avoir.dateEmission)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Type</span>
            <span className="text-xs font-medium">{avoir.type === "SIMPLE" ? "Simple" : "Financier"}</span>
          </div>
          {avoir.motif && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Motif</span>
              <span className="text-xs font-medium">{avoir.motif}</span>
            </div>
          )}
          {avoir.invoice && (
            <div className="flex justify-between">
              <span className="text-muted-foreground text-xs">Facture liée</span>
              <span className="text-xs font-medium">{(avoir.invoice as { numero: string }).numero} — {formatTND((avoir.invoice as { totalTTC: string }).totalTTC)}</span>
            </div>
          )}
          {avoir.notes && (
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Notes</span>
              <p className="text-xs mt-0.5">{avoir.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Lignes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground py-2 pl-4">Description</TableHead>
                <TableHead className="text-xs text-muted-foreground py-2 text-right">Qté</TableHead>
                <TableHead className="text-xs text-muted-foreground py-2 text-right">P.U. HT</TableHead>
                <TableHead className="text-xs text-muted-foreground py-2 text-right">Rem.</TableHead>
                <TableHead className="text-xs text-muted-foreground py-2 text-right">TVA</TableHead>
                <TableHead className="text-xs text-muted-foreground py-2 text-right pr-4">Total HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id} className="hover:bg-muted/30">
                  <TableCell className="py-2 pl-4">
                    <p className="text-xs font-medium">{line.description}</p>
                    {line.product && <p className="text-xs text-muted-foreground">{(line.product as { code?: string }).code ?? ""}</p>}
                  </TableCell>
                  <TableCell className="py-2 text-right text-xs">{line.quantite}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{formatTND(line.prixHT)}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{parseFloat(line.remise) > 0 ? `${line.remise}%` : "—"}</TableCell>
                  <TableCell className="py-2 text-right text-xs">{line.tauxTVA}%{line.fodec && <span className="ml-1 text-muted-foreground">+F</span>}</TableCell>
                  <TableCell className="py-2 text-right text-xs font-medium pr-4">{formatTND(line.totalHT)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Historique des Paiements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground py-2 pl-4">Date</TableHead>
                  <TableHead className="text-xs text-muted-foreground py-2">Méthode</TableHead>
                  <TableHead className="text-xs text-muted-foreground py-2">Référence</TableHead>
                  <TableHead className="text-xs text-muted-foreground py-2 text-right pr-4">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="py-2 pl-4 text-xs">{formatDate(p.dateReglement)}</TableCell>
                    <TableCell className="py-2 text-xs"><Badge variant="outline" className="text-xs capitalize">{p.methode.toLowerCase()}</Badge></TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
                    <TableCell className="py-2 text-right text-xs font-semibold text-emerald-600 pr-4">{formatCurrency(p.montant, "TND")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {avoir.type === "FINANCIER" && mouvements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Mouvements Financiers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground py-2 pl-4">Date</TableHead>
                  <TableHead className="text-xs text-muted-foreground py-2">Type</TableHead>
                  <TableHead className="text-xs text-muted-foreground py-2">Notes</TableHead>
                  <TableHead className="text-xs text-muted-foreground py-2 text-right pr-4">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mouvements.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/30">
                    <TableCell className="py-2 pl-4 text-xs">{formatDate(m.dateMouvement)}</TableCell>
                    <TableCell className="py-2 text-xs">
                      <Badge variant="outline" className={m.type === "CREDIT" ? "text-xs border-green-300 text-green-700 dark:border-green-700 dark:text-green-400" : "text-xs border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"}>
                        {m.type === "CREDIT" ? "Crédit" : "Débit"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">{m.notes ?? "—"}</TableCell>
                    <TableCell className="py-2 text-right text-xs font-semibold pr-4">{formatTND(m.montant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
