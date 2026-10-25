"use client"

import { ArrowLeft, CheckCircle, XCircle, Trash2, Save, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils"
import type { ExportStatus } from "@/lib/types"

function statusBadge(status: ExportStatus) {
  const variants: Record<string, string> = {
    BROUILLON: "bg-gray-100 text-gray-700 border-gray-200",
    EN_COURS: "bg-gray-100 text-gray-700 border-gray-200",
    VALIDE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ANNULE: "bg-red-50 text-red-700 border-red-200",
  }
  const labels: Record<string, string> = {
    BROUILLON: "Brouillon",
    EN_COURS: "En cours",
    VALIDE: "Validé",
    ANNULE: "Annulé",
  }
  return <Badge variant="outline" className={`text-xs ${variants[status] ?? ""}`}>{labels[status] ?? status}</Badge>
}

interface ExportData {
  id: string
  numero: string
  dateCreation: Date | string
  status: ExportStatus
}

interface Props {
  exp: ExportData
  isEditing: boolean
  isPending: boolean
  onBack: () => void
  onEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  onStatusChange: (status: ExportStatus) => void
  onDelete: () => void
}

export function ExportDetailHeader({ exp, isEditing, isPending, onBack, onEdit, onCancelEdit, onSave, onStatusChange, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">{exp.numero}</h1>
            {statusBadge(exp.status)}
          </div>
          <p className="text-sm text-muted-foreground">Créé le {formatDate(exp.dateCreation)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {exp.status === "BROUILLON" && !isEditing && (
          <Button size="sm" onClick={() => onStatusChange("EN_COURS")}>
            <CheckCircle className="h-4 w-4 mr-1" /> Marquer En cours
          </Button>
        )}
        {exp.status === "EN_COURS" && !isEditing && (
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onStatusChange("VALIDE")}>
            <CheckCircle className="h-4 w-4 mr-1" /> Valider
          </Button>
        )}
        {(exp.status === "BROUILLON" || exp.status === "EN_COURS") && !isEditing && (
          <Button size="sm" variant="outline" className="text-red-600" onClick={() => onStatusChange("ANNULE")}>
            <XCircle className="h-4 w-4 mr-1" /> Annuler
          </Button>
        )}
        {(exp.status === "BROUILLON" || exp.status === "EN_COURS") && (
          isEditing ? (
            <>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
              <Button size="sm" onClick={onSave} disabled={isPending}>
                <Save className="h-4 w-4 mr-1" /> Enregistrer
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-1" /> Modifier
            </Button>
          )
        )}
        <Button size="sm" variant="outline" className="text-red-600" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-1" /> Supprimer
        </Button>
      </div>
    </div>
  )
}
