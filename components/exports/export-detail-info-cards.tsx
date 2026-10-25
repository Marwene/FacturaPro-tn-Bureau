"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/utils"

interface ExportData {
  tiers?: { raisonSociale?: string; ville?: string | null } | null
  dateCreation: Date | string
  notes?: string | null
  decVente?: string | null
  dateDecVente?: Date | string | null
  simultanee?: string | null
  dateSimultanee?: Date | string | null
}

interface EditStore {
  decVente: string
  dateDecVente: string
  simultanee: string
  dateSimultanee: string
  notes: string
  setDecVente: (v: string) => void
  setDateDecVente: (v: string) => void
  setSimultanee: (v: string) => void
  setDateSimultanee: (v: string) => void
  setNotes: (v: string) => void
}

interface Props {
  exp: ExportData
  isEditing: boolean
  edit: EditStore
}

export function ExportDetailInfoCards({ exp, isEditing, edit }: Props) {
  if (isEditing) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Déclarations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <label className="text-xs text-muted-foreground">DEC Vente</label>
              <Input value={edit.decVente} onChange={(e) => edit.setDecVente(e.target.value)} className="h-8 text-xs" placeholder="N° déclaration" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date DEC</label>
              <Input type="date" value={edit.dateDecVente} onChange={(e) => edit.setDateDecVente(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Simultanée</label>
              <Input value={edit.simultanee} onChange={(e) => edit.setSimultanee(e.target.value)} className="h-8 text-xs" placeholder="N° déclaration" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date Simultanée</label>
              <Input type="date" value={edit.dateSimultanee} onChange={(e) => edit.setDateSimultanee(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Notes</label>
              <Textarea value={edit.notes} onChange={(e) => edit.setNotes(e.target.value)} className="h-16 text-xs resize-none" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{exp.tiers?.raisonSociale ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ville</span>
              <span>{exp.tiers?.ville ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date création</span>
              <span>{formatDate(exp.dateCreation)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">{exp.tiers?.raisonSociale ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Ville</span>
            <span>{exp.tiers?.ville ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date création</span>
            <span>{formatDate(exp.dateCreation)}</span>
          </div>
          {exp.notes && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notes</span>
              <span className="max-w-[200px] text-right">{exp.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Déclarations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">DEC Vente</span>
            <span className="font-medium">{exp.decVente ?? "—"}</span>
          </div>
          {exp.dateDecVente && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date DEC</span>
              <span>{formatDate(exp.dateDecVente)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Simultanée</span>
            <span className="font-medium">{exp.simultanee ?? "—"}</span>
          </div>
          {exp.dateSimultanee && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date Simultanée</span>
              <span>{formatDate(exp.dateSimultanee)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
