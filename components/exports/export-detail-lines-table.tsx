"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarcodeDisplay } from "@/components/barcode-display"
import { Plus, Trash2 } from "lucide-react"
import type { SerializedNgpCode } from "@/lib/types"

interface ExportLine {
  id: string
  ngpCodeId?: string | null
  ngpCode?: string | null
  barcode?: string | null
  quantite: string
  bonLivraisonNumero?: string | null
  quantiteBL?: string | null
  resteQuantite?: string | null
  invoiceNumero?: string | null
}

interface EditLine {
  id: string
  ngpCodeId: string
  ngpCode: string
  barcode: string
  quantite: string
  bonLivraisonNumero: string
  invoiceNumero: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NgpCodeish = Record<string, any>

interface Props {
  lines: ExportLine[]
  isEditing: boolean
  editLines?: EditLine[]
  ngpCodes?: SerializedNgpCode[]
  onAddLine?: () => void
  onRemoveLine?: (id: string) => void
  onUpdateLine?: (id: string, field: string, value: string) => void
}

export function ExportDetailLinesTable({ lines, isEditing, editLines, ngpCodes, onAddLine, onRemoveLine, onUpdateLine }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Lignes d&apos;export</CardTitle>
        {isEditing && onAddLine && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onAddLine}>
            <Plus className="h-3 w-3 mr-1" /> Ajouter
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">NGP</TableHead>
              <TableHead className="text-xs">Code Barre</TableHead>
              <TableHead className="text-xs text-right">Qté</TableHead>
              <TableHead className="text-xs">BL</TableHead>
              <TableHead className="text-xs text-right">Qté BL</TableHead>
              <TableHead className="text-xs text-right">Reste</TableHead>
              <TableHead className="text-xs">Facture</TableHead>
              {isEditing && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEditing && editLines ? (
              editLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                    Aucune ligne. Cliquez sur &quot;Ajouter&quot; pour ajouter un code NGP.
                  </TableCell>
                </TableRow>
              ) : (
                editLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <Select value={line.ngpCodeId} onValueChange={(v) => onUpdateLine?.(line.id, "ngpCodeId", v)}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="NGP..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(ngpCodes ?? []).map((code) => (
                            <SelectItem key={code.id} value={code.id} className="text-xs font-mono">
                              {code.code} {code.description ? `— ${code.description}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><BarcodeDisplay value={line.barcode} compact /></TableCell>
                    <TableCell>
                      <Input type="number" step="0.001" value={line.quantite} onChange={(e) => onUpdateLine?.(line.id, "quantite", e.target.value)} className="h-7 text-xs text-right w-20 ml-auto" />
                    </TableCell>
                    <TableCell className="text-xs">{line.bonLivraisonNumero || "—"}</TableCell>
                    <TableCell className="text-right text-xs">—</TableCell>
                    <TableCell className="text-right text-xs">—</TableCell>
                    <TableCell className="text-xs">{line.invoiceNumero || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onRemoveLine?.(line.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )
            ) : (
              lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Aucune ligne
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell><span className="font-mono text-xs">{line.ngpCode ?? "—"}</span></TableCell>
                    <TableCell><BarcodeDisplay value={line.barcode ?? ""} compact /></TableCell>
                    <TableCell className="text-right text-sm">{parseFloat(line.quantite).toFixed(3)}</TableCell>
                    <TableCell className="text-xs">{line.bonLivraisonNumero ?? "—"}</TableCell>
                    <TableCell className="text-right text-xs">{line.quantiteBL ? parseFloat(line.quantiteBL).toFixed(3) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">
                      <span className={parseFloat(line.resteQuantite || "0") === 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                        {line.resteQuantite ? parseFloat(line.resteQuantite).toFixed(3) : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{line.invoiceNumero ?? "—"}</TableCell>
                  </TableRow>
                ))
              )
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
