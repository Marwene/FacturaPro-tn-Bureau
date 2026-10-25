"use client"

import { useMemo, useState } from "react"
import { useOrdresFabrication, useOrdreFabricationMutations } from "@/hooks/use-ordres-fabrication"
import type { SerializedOrdreFabrication, OrdrePlan } from "@/lib/types"
import { GanttChart, type TimelineSlotData, type TimelineRowData, type GanttViewMode } from "./gantt-chart"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, AlertCircle, CalendarDays, CalendarRange, Calendar, Plus, Package, Clock, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

const COLORS = ["#3b82f6", "#eab308", "#22c55e", "#a855f7", "#f97316", "#ec4899", "#14b8a6", "#6366f1"]

const VIEWS: { mode: GanttViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: "day", label: "Jour", icon: <Calendar className="h-3.5 w-3.5" /> },
  { mode: "week", label: "Semaine", icon: <CalendarDays className="h-3.5 w-3.5" /> },
  { mode: "month", label: "Mois", icon: <CalendarRange className="h-3.5 w-3.5" /> },
]

export function PlanningClient() {
  const [viewMode, setViewMode] = useState<GanttViewMode>("day")
  const { data, isLoading } = useOrdresFabrication()
  const { update, remove } = useOrdreFabricationMutations()

  // Plan dialog state
  const [planOrdre, setPlanOrdre] = useState<OrdrePlan | null>(null)
  const [planDate, setPlanDate] = useState("")
  const [planHeure, setPlanHeure] = useState("08:00")
  const [planDuree, setPlanDuree] = useState("4")
  const [planRow, setPlanRow] = useState("")

  // Unschedule confirmation
  const [unscheduleOrdre, setUnscheduleOrdre] = useState<SerializedOrdreFabrication | null>(null)

  // Rows (production lines / workstations)
  const defaultRows: TimelineRowData[] = useMemo(() => [
    { id: "ligne-1", label: "Ligne 1", capacity: "Confection" },
    { id: "ligne-2", label: "Ligne 2", capacity: "Confection" },
    { id: "ligne-3", label: "Ligne 3", capacity: "Broderie" },
    { id: "ligne-4", label: "Ligne 4", capacity: "Finition" },
  ], [])

  // Assign OFs to rows (round-robin if no row specified)
  const { scheduled, unscheduled } = useMemo(() => {
    if (!data?.ordres) return { scheduled: [] as TimelineSlotData[], unscheduled: [] as OrdrePlan[] }
    const all: OrdrePlan[] = data.ordres

    let rowIdx = 0
    const sched: TimelineSlotData[] = []
    const unsched: OrdrePlan[] = []

    for (const o of all) {
      if (o.dateDebut && ["CONFIRME", "EN_COURS"].includes(o.statut)) {
        const startDate = new Date(o.dateDebut)
        const endDate = o.dateFin ? new Date(o.dateFin) : new Date(startDate.getTime() + 2 * MS_PER_HOUR)
        const rowId = o.planningRowId ?? defaultRows[rowIdx % defaultRows.length].id

        sched.push({
          id: o.id,
          rowId,
          startTime: `${startDate.getHours().toString().padStart(2, "0")}:${startDate.getMinutes().toString().padStart(2, "0")}`,
          duration: Math.max(30, Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_MIN)),
          title: o.product?.nom ?? "Produit",
          subtitle: o.code,
          color: COLORS[rowIdx % COLORS.length],
          statut: o.statut,
          quantite: o.quantite,
          dateLivraison: o.dateLivraison ? new Date(o.dateLivraison) : undefined,
          data: o,
        })
        rowIdx++
      }

      if (o.statut === "CONFIRME" && !o.dateDebut) {
        unsched.push(o)
      }
    }

    return { scheduled: sched, unscheduled: unsched }
  }, [data, defaultRows])

  const handleSlotUpdate = async (slotId: string, newStartTime: string, newRowId: string) => {
    const slot = scheduled.find((s) => s.id === slotId)
    if (!slot) return

    // Preserve the existing date, only update the time
    const dateDebut: unknown = slot.data?.dateDebut
    const existingDate =
      dateDebut &&
      (typeof dateDebut === "string" || typeof dateDebut === "number" || dateDebut instanceof Date)
        ? new Date(dateDebut)
        : new Date()
    const newStartDate = parseTimeToDate(newStartTime, existingDate)
    const newEndDate = new Date(newStartDate.getTime() + slot.duration * MS_PER_MIN)

    await update.mutateAsync({
      id: slotId,
      data: {
        dateDebut: newStartDate.toISOString(),
        dateFin: newEndDate.toISOString(),
        planningRowId: newRowId,
      },
    })
  }

  async function handlePlanSubmit() {
    if (!planOrdre) return
    const start = new Date(`${planDate}T${planHeure}:00`)
    const durationMs = parseInt(planDuree) * MS_PER_HOUR
    const end = new Date(start.getTime() + durationMs)

    await update.mutateAsync({
      id: planOrdre.id,
      data: {
        dateDebut: start.toISOString(),
        dateFin: end.toISOString(),
        planningRowId: planRow || defaultRows[0].id,
      },
    })
    setPlanOrdre(null)
  }

  async function handleUnschedule() {
    if (!unscheduleOrdre) return
    await update.mutateAsync({
      id: unscheduleOrdre.id,
      data: { dateDebut: null, dateFin: null },
    })
    setUnscheduleOrdre(null)
  }

  function openPlanDialog(o: SerializedOrdreFabrication) {
    setPlanOrdre(o)
    const tomorrow = new Date(Date.now() + MS_PER_DAY)
    setPlanDate(tomorrow.toISOString().slice(0, 10))
    setPlanHeure("08:00")
    setPlanDuree("4")
    setPlanRow("")
  }

  return (
    <div className="flex flex-1 flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold">Planning de production</h1>
          <p className="text-sm text-muted-foreground">
            {scheduled.length} OF planifié{scheduled.length > 1 ? "s" : ""}
            {unscheduled.length > 0 && ` · ${unscheduled.length} à planifier`}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border">
          {VIEWS.map((v) => (
            <Button
              key={v.mode}
              variant="ghost"
              size="sm"
              className={cn("h-7 gap-1 text-xs px-3", viewMode === v.mode && "bg-background shadow-sm font-medium")}
              onClick={() => setViewMode(v.mode)}
            >
              {v.icon}{v.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Sidebar: unscheduled OFs */}
          {unscheduled.length > 0 && (
            <div className="w-64 shrink-0 space-y-2 overflow-y-auto">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                À planifier ({unscheduled.length})
              </h2>
              {unscheduled.map((o) => (
                <div key={o.id} className="rounded-lg border p-2.5 space-y-1.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-medium truncate">{o.code}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{o.product?.nom}</p>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{o.quantite} pièce{o.quantite > 1 ? "s" : ""}</span>
                    {o.dateLivraison && (
                      <span className="flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {new Date(o.dateLivraison).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>
                  <Button size="sm" className="w-full h-7 gap-1 text-xs" onClick={() => openPlanDialog(o)}>
                    <Plus className="h-3 w-3" />
                    Planifier
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Gantt */}
          <div className="flex-1 min-w-0">
            {scheduled.length === 0 && unscheduled.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-1">
                <AlertCircle className="h-8 w-8" />
                <p className="font-medium">Aucun OF à planifier</p>
                <p className="text-sm">Confirmez des commandes dans l&apos;atelier pour commencer</p>
              </div>
            ) : scheduled.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-1 border rounded-lg">
                <CalendarDays className="h-8 w-8" />
                <p className="font-medium">Aucun OF planifié</p>
                <p className="text-sm">Utilisez le panneau de gauche pour planifier des OF</p>
              </div>
            ) : (
              <GanttChart
                slots={scheduled}
                rows={defaultRows}
                viewMode={viewMode}
                startHour={7}
                endHour={19}
                snapIntervalMinutes={15}
                onSlotUpdate={handleSlotUpdate}
              />
            )}
          </div>
        </div>
      )}

      {/* Plan dialog */}
      <Dialog open={!!planOrdre} onOpenChange={(open) => { if (!open) setPlanOrdre(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Planifier {planOrdre?.code}</DialogTitle>
            <DialogDescription className="text-xs">
              {planOrdre?.product?.nom} · {planOrdre?.quantite} pièce{(planOrdre?.quantite ?? 0) > 1 ? "s" : ""}
              {planOrdre?.dateLivraison && <> · Livraison : {new Date(planOrdre.dateLivraison).toLocaleDateString("fr-FR")}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Ligne de production</Label>
              <Select value={planRow} onValueChange={setPlanRow}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir une ligne..." /></SelectTrigger>
                <SelectContent>
                  {defaultRows.map((r) => <SelectItem key={r.id} value={r.id}>{r.label} — {r.capacity}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date de début</Label>
              <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Heure de début</Label>
              <Input type="time" value={planHeure} onChange={(e) => setPlanHeure(e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Durée estimée (heures)</Label>
              <Input type="number" min={1} max={168} value={planDuree} onChange={(e) => setPlanDuree(e.target.value)} className="h-8 text-sm" />
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Étaler sur {parseInt(planDuree) >= 24 ? `${Math.round(parseInt(planDuree) / 24)} jour(s)` : `${planDuree} heure(s)`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPlanOrdre(null)}>Annuler</Button>
            <Button size="sm" onClick={handlePlanSubmit} disabled={update.isPending || !planDate || !planRow}>
              {update.isPending ? "Planification..." : "Ajouter au planning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unschedule confirmation */}
      <ConfirmDeleteDialog
        open={!!unscheduleOrdre}
        onOpenChange={(open) => { if (!open) setUnscheduleOrdre(null) }}
        onConfirm={handleUnschedule}
        title="Retirer du planning ?"
        description={`${unscheduleOrdre?.code ?? ""} ne sera plus planifié. Les dates seront effacées.`}
        isLoading={update.isPending}
        confirmLabel="Retirer"
      />
    </div>
  )
}

const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_MIN = 60 * 1000
const MS_PER_DAY = 24 * MS_PER_HOUR

function parseTimeToDate(timeStr: string, baseDate: Date): Date {
  const [h, m] = timeStr.split(":").map(Number)
  const d = new Date(baseDate)
  d.setHours(h, m, 0, 0)
  return d
}

function formatTime(date: Date): string {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
}
