"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragMoveEvent,
} from "@dnd-kit/core"
import { cn } from "@/lib/utils"

export type GanttViewMode = "day" | "week" | "month"

export interface TimelineSlotData {
  id: string
  rowId: string
  startTime: string
  duration: number
  title: string
  subtitle?: string
  color?: string
  statut?: string
  quantite?: number
  dateLivraison?: Date
  data?: Record<string, unknown>
}

export interface TimelineRowData {
  id: string
  label: string
  capacity?: string
}

export interface GanttChartProps {
  slots: TimelineSlotData[]
  rows: TimelineRowData[]
  viewMode?: GanttViewMode
  startHour?: number
  endHour?: number
  snapIntervalMinutes?: number
  columnWidth?: number
  onSlotUpdate: (slotId: string, newStartTime: string, newRowId: string) => void
  className?: string
}

const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_MIN = 60 * 1000
const MS_PER_DAY = 24 * MS_PER_HOUR
const ROW_HEIGHT = 56
const HEADER_HEIGHT = 44

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

function minutesToX(minutes: number, startMin: number, totalMin: number, width: number): number {
  return ((minutes - startMin) / totalMin) * width
}

function useCurrentTime() {
  const [now, setNow] = useState(new Date())
  // Justification useEffect : timer setInterval (60 s) — l'horloge de la timeline avance indépendamment des rendus React (non réactif : le passage du temps est un événement externe, setNow(new Date()) ne peut venir que d'un intervalle navigateur).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  return now
}

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", CONFIRME: "Confirmé", EN_COURS: "En cours", TERMINE: "Terminé", ANNULE: "Annulé",
}

// ─── Slot Component ───────────────────────────────────────────────
function TimelineSlot({
  slot, left, width, isDragging, isConflict, rowIndex,
}: {
  slot: TimelineSlotData
  left: number
  width: number
  isDragging?: boolean
  isConflict?: boolean
  rowIndex: number
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: slot.id,
    data: { slot, rowIndex },
  })

  const barHeight = Math.min(ROW_HEIGHT - 10, 36)
  const top = Math.floor((ROW_HEIGHT - barHeight) / 2)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute rounded-md overflow-hidden border border-white/20 select-none group cursor-grab transition-shadow hover:shadow-md",
        isDragging && "opacity-30",
        isConflict && "ring-2 ring-red-500 ring-offset-1",
      )}
      style={{
        left: `${left}px`,
        width: `${Math.max(width, 4)}px`,
        top: `${top}px`,
        height: `${barHeight}px`,
        backgroundColor: slot.color ?? "#3b82f6",
        transform: transform ? `translate(${transform.x}px, 0px)` : undefined,
        zIndex: isDragging ? 100 : 10,
      }}
      {...listeners}
      {...attributes}
    >
      <div className={cn("px-2 py-1 text-white truncate", width > 80 ? "text-[11px]" : "text-[9px]")}>
        <div className="truncate font-medium">{slot.subtitle ?? slot.title}</div>
        {width > 80 && (
          <div className="truncate opacity-80 text-[10px] flex gap-1">
            <span>{slot.title}</span>
            {slot.quantite && <span>· {slot.quantite}p</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Drop Zone per Row ────────────────────────────────────────────
function RowDropZone({ rowId, children }: { rowId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `row-${rowId}` })
  return (
    <div
      ref={setNodeRef}
      className={cn("relative flex-1 min-h-0", isOver && "bg-blue-50/30")}
      style={{ height: `${ROW_HEIGHT}px` }}
    >
      {children}
    </div>
  )
}

// ─── Main GanttChart ─────────────────────────────────────────────
export function GanttChart({
  slots,
  rows,
  viewMode = "day",
  startHour = 8,
  endHour = 18,
  snapIntervalMinutes = 15,
  columnWidth = 140,
  onSlotUpdate,
  className,
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const now = useCurrentTime()
  const [containerWidth, setContainerWidth] = useState(800)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewPos, setPreviewPos] = useState<{ left: number; width: number; rowId: string } | null>(null)
  const [draggedSlot, setDraggedSlot] = useState<TimelineSlotData | null>(null)
  const [mouseTime, setMouseTime] = useState<string | null>(null)

  // Determine time range based on viewMode
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const timeRange = useMemo(() => {
    if (viewMode === "day") {
      return { start: today, totalMinutes: (endHour - startHour) * 60 }
    }
    if (viewMode === "week") {
      const d = new Date(today)
      const day = d.getDay()
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      return { start: d, totalMinutes: 7 * 24 * 60 }
    }
    // month
    return { start: new Date(today.getFullYear(), today.getMonth(), 1), totalMinutes: 28 * 24 * 60 }
  }, [today, viewMode, startHour, endHour])

  const totalMinutes = timeRange.totalMinutes
  const startOffset = viewMode === "day" ? startHour * 60 : 0

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Auto-scroll to current time
  useEffect(() => {
    const el = scrollRef.current
    if (!el || containerWidth <= 0 || viewMode !== "day") return
    const nowMin = now.getHours() * 60 + now.getMinutes()
    if (nowMin >= startHour * 60 && nowMin <= endHour * 60) {
      const x = minutesToX(nowMin, startOffset, totalMinutes, containerWidth)
      el.scrollLeft = Math.max(0, x - containerWidth / 3)
    }
  }, [containerWidth, viewMode, startHour, endHour, startOffset, totalMinutes])

  // Build header markers
  const headerMarkers = useMemo(() => {
    const markers: { label: string; sublabel?: string; left: number; isMajor: boolean }[] = []
    if (viewMode === "day") {
      for (let h = startHour; h <= endHour; h++) {
        const min = h * 60
        const left = minutesToX(min, startOffset, totalMinutes, containerWidth)
        markers.push({ label: `${h.toString().padStart(2, "0")}h`, left, isMajor: true })
      }
    } else if (viewMode === "week") {
      const cursor = new Date(timeRange.start)
      for (let i = 0; i < 7; i++) {
        const min = i * 24 * 60
        const left = minutesToX(min, startOffset, totalMinutes, containerWidth)
        const dayName = cursor.toLocaleDateString("fr-FR", { weekday: "short" })
        const dayNum = cursor.getDate()
        markers.push({ label: dayName, sublabel: `${dayNum}`, left, isMajor: true })
        cursor.setDate(cursor.getDate() + 1)
      }
    } else {
      const cursor = new Date(timeRange.start)
      for (let i = 0; i < 28; i++) {
        const min = i * 24 * 60
        const left = minutesToX(min, startOffset, totalMinutes, containerWidth)
        const dayNum = cursor.getDate()
        const dayName = cursor.toLocaleDateString("fr-FR", { weekday: "short" })
        const isFirst = dayNum === 1
        markers.push({
          label: isFirst ? cursor.toLocaleDateString("fr-FR", { month: "short" }) : dayName,
          sublabel: `${dayNum}`,
          left,
          isMajor: isFirst || cursor.getDay() === 1,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return markers
  }, [viewMode, startHour, endHour, startOffset, totalMinutes, containerWidth, timeRange])

  // Grid lines
  const minorLines = useMemo(() => {
    if (viewMode !== "day") return []
    const lines: number[] = []
    for (let m = startHour * 60 + snapIntervalMinutes; m < endHour * 60; m += snapIntervalMinutes) {
      if (m % 60 !== 0) lines.push(minutesToX(m, startOffset, totalMinutes, containerWidth))
    }
    return lines
  }, [viewMode, startHour, endHour, snapIntervalMinutes, startOffset, totalMinutes, containerWidth])

  // Conflict detection
  const conflicts = useMemo(() => {
    const ids = new Set<string>()
    const byRow: Record<string, TimelineSlotData[]> = {}
    for (const s of slots) {
      if (!byRow[s.rowId]) byRow[s.rowId] = []
      byRow[s.rowId].push(s)
    }
    for (const rowSlots of Object.values(byRow)) {
      for (let i = 0; i < rowSlots.length; i++) {
        for (let j = i + 1; j < rowSlots.length; j++) {
          const a = rowSlots[i]; const b = rowSlots[j]
          const aStart = timeToMinutes(a.startTime)
          const aEnd = aStart + a.duration
          const bStart = timeToMinutes(b.startTime)
          const bEnd = bStart + b.duration
          if (aStart < bEnd && bStart < aEnd) { ids.add(a.id); ids.add(b.id) }
        }
      }
    }
    return ids
  }, [slots])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
  )

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const slot = event.active.data.current?.slot as TimelineSlotData
    setActiveId(event.active.id as string)
    setDraggedSlot(slot)
  }, [])

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !draggedSlot) return

    // Calculate original slot position, then add drag delta
    const origStartMin = timeToMinutes(draggedSlot.startTime)
    const origLeft = minutesToX(origStartMin, startOffset, totalMinutes, containerWidth)
    const newLeft = origLeft + event.delta.x
    const relMin = (newLeft / containerWidth) * totalMinutes
    const snapped = Math.round(relMin / snapIntervalMinutes) * snapIntervalMinutes + startOffset
    setMouseTime(minutesToTime(snapped))

    // For row detection, use current pointer position (activatorEvent + delta)
    const ev = event.activatorEvent as MouseEvent | PointerEvent
    const currentY = ev.clientY + event.delta.y

    // Determine which row we're over
    const rowsEl = scrollRef.current?.querySelector("[data-rows-container]")
    if (rowsEl) {
      const rowEls = rowsEl.querySelectorAll("[data-row-id]")
      for (const el of rowEls) {
        const rect2 = el.getBoundingClientRect()
        if (currentY >= rect2.top && currentY <= rect2.bottom) {
          const newRowId = el.getAttribute("data-row-id") ?? draggedSlot.rowId
          const durationMin = draggedSlot.duration
          const previewLeft = minutesToX(snapped, startOffset, totalMinutes, containerWidth)
          const previewWidth = minutesToX(snapped + durationMin, startOffset, totalMinutes, containerWidth) - previewLeft
          setPreviewPos({ left: previewLeft, width: previewWidth, rowId: newRowId })
          return
        }
      }
    }
  }, [containerWidth, totalMinutes, startOffset, snapIntervalMinutes, draggedSlot])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const slot = event.active.data.current?.slot as TimelineSlotData
    if (!slot) { clear(); return }

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      // Calculate original slot position, then add drag delta for new position
      const origStartMin = timeToMinutes(slot.startTime)
      const origLeft = minutesToX(origStartMin, startOffset, totalMinutes, containerWidth)
      const newLeft = origLeft + event.delta.x
      const relMin = (newLeft / containerWidth) * totalMinutes
      const snapped = Math.round(relMin / snapIntervalMinutes) * snapIntervalMinutes + startOffset
      const newTime = minutesToTime(snapped)

      // Determine row using current pointer position (activatorEvent + delta)
      const ev = event.activatorEvent as MouseEvent | PointerEvent
      const currentY = ev.clientY + event.delta.y
      let newRowId = slot.rowId
      const rowsEl = scrollRef.current?.querySelector("[data-rows-container]")
      if (rowsEl) {
        const rowEls = rowsEl.querySelectorAll("[data-row-id]")
        for (const el of rowEls) {
          const rect2 = el.getBoundingClientRect()
          if (currentY >= rect2.top && currentY <= rect2.bottom) {
            newRowId = el.getAttribute("data-row-id") ?? slot.rowId
            break
          }
        }
      }
      onSlotUpdate(slot.id, newTime, newRowId)
    }
    clear()
    function clear() { setActiveId(null); setDraggedSlot(null); setPreviewPos(null); setMouseTime(null) }
  }, [containerWidth, totalMinutes, snapIntervalMinutes, startOffset, onSlotUpdate])

  const handleDragCancel = useCallback(() => {
    setActiveId(null); setDraggedSlot(null); setPreviewPos(null); setMouseTime(null)
  }, [])

  // Row lookup
  const rowMap = useMemo(() => Object.fromEntries(rows.map((r) => [r.id, r])), [rows])
  const slotsByRow = useMemo(() => {
    const m: Record<string, TimelineSlotData[]> = {}
    for (const s of slots) {
      if (!m[s.rowId]) m[s.rowId] = []
      m[s.rowId].push(s)
    }
    return m
  }, [slots])

  // Current time position
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const nowX = minutesToX(nowMinutes, startOffset, totalMinutes, containerWidth)
  const showNow = viewMode === "day" && nowMinutes >= startHour * 60 && nowMinutes <= endHour * 60

  const timelineWidth = Math.max(containerWidth, containerWidth)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div
        ref={containerRef}
        className={cn("relative border rounded-lg bg-background select-none overflow-hidden", className)}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Escape" && activeId) handleDragCancel() }}
      >
        {/* Header */}
        <div className="flex border-b">
          {/* Left column header */}
          <div
            className="shrink-0 border-r bg-muted/20 px-3 flex items-center text-xs font-semibold text-muted-foreground"
            style={{ width: `${columnWidth}px`, height: `${HEADER_HEIGHT}px` }}
          >
            Atelier
          </div>
          {/* Timeline header */}
          <div className="flex-1 overflow-hidden" style={{ height: `${HEADER_HEIGHT}px` }}>
            <div ref={scrollRef} className="overflow-x-auto">
              <div style={{ minWidth: `${timelineWidth}px`, height: "100%", position: "relative" }}>
                {headerMarkers.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "absolute top-0 text-[10px] text-muted-foreground px-1 pt-1 border-l h-full",
                      m.isMajor ? "font-semibold" : "text-[9px] opacity-60",
                    )}
                    style={{ left: `${m.left}px`, borderColor: "hsl(var(--border))" }}
                  >
                    <div className="leading-tight">{m.label}</div>
                    {m.sublabel && <div className="text-[9px] opacity-60 leading-tight">{m.sublabel}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Left column: row headers */}
          <div className="shrink-0 border-r" style={{ width: `${columnWidth}px` }}>
            {rows.map((row) => {
              const rowSlots = slotsByRow[row.id] ?? []
              return (
                <div
                  key={row.id}
                  className="px-3 flex flex-col justify-center border-b border-muted/10"
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  <div className="text-sm font-medium truncate">{row.label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {rowSlots.length} OF · {rowSlots.reduce((s, sl) => s + (sl.quantite ?? 0), 0)}p
                  </div>
                </div>
              )
            })}
          </div>

          {/* Timeline area */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div data-rows-container style={{ minWidth: `${timelineWidth}px`, position: "relative" }}>
              {/* Grid lines */}
              {minorLines.map((left, i) => (
                <div key={`m-${i}`} className="absolute top-0 bottom-0 w-px bg-muted/15 pointer-events-none z-0" style={{ left: `${left}px` }} />
              ))}
              {headerMarkers.map((m, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute top-0 bottom-0 w-px pointer-events-none z-0"
                  style={{ left: `${m.left}px`, backgroundColor: m.isMajor ? "hsl(var(--border)/0.4)" : "hsl(var(--border)/0.15)" }}
                />
              ))}

              {/* Row drop zones + Slots */}
              {rows.map((row) => {
                const rowSlots = slotsByRow[row.id] ?? []
                return (
                  <RowDropZone key={row.id} rowId={row.id}>
                    <div data-row-id={row.id} className="absolute inset-0 border-b border-muted/10" />
                    {rowSlots.map((slot) => {
                      const startMin = timeToMinutes(slot.startTime)
                      const left = minutesToX(startMin, startOffset, totalMinutes, timelineWidth)
                      const w = minutesToX(startMin + slot.duration, startOffset, totalMinutes, timelineWidth) - left
                      return (
                        <TimelineSlot
                          key={slot.id}
                          slot={slot}
                          left={left}
                          width={w}
                          isDragging={activeId === slot.id}
                          isConflict={conflicts.has(slot.id)}
                          rowIndex={0}
                        />
                      )
                    })}
                  </RowDropZone>
                )
              })}

              {/* Current time */}
              {showNow && (
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none" style={{ left: `${nowX}px` }}>
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-[3px]" />
                  <div className="absolute top-1 -ml-4 text-[9px] text-red-500 font-semibold whitespace-nowrap bg-background/80 px-0.5 rounded">
                    {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              )}

              {/* Mouse indicator */}
              {mouseTime && activeId && (
                <div
                  className="absolute -top-7 z-50 px-1.5 py-0.5 rounded bg-popover text-popover-foreground text-[10px] font-mono shadow border pointer-events-none whitespace-nowrap"
                  style={{ left: `${minutesToX(timeToMinutes(mouseTime), startOffset, totalMinutes, timelineWidth)}px` }}
                >
                  {mouseTime}
                </div>
              )}

              {/* Drag preview */}
              {previewPos && draggedSlot && (
                <div
                  className="absolute rounded-md border-2 border-dashed border-blue-400 bg-blue-400/20 pointer-events-none z-50"
                  style={{
                    left: `${previewPos.left}px`,
                    width: `${Math.max(previewPos.width, 4)}px`,
                    top: `${Math.floor((ROW_HEIGHT - 36) / 2)}px`,
                    height: `${Math.min(ROW_HEIGHT - 10, 36)}px`,
                  }}
                >
                  <div className="px-2 py-1 text-[11px] text-blue-700 truncate font-medium">
                    {draggedSlot.subtitle ?? draggedSlot.title}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground pointer-events-none z-10">
          {slots.length} OF · {rows.length} ligne{rows.length > 1 ? "s" : ""}
        </div>
      </div>

      <DragOverlay>
        {activeId && draggedSlot ? (
          <div
            className="rounded-md border-2 border-blue-500 bg-blue-500/80 text-white shadow-lg"
            style={{
              width: `${Math.max(60, (draggedSlot.duration / totalMinutes) * timelineWidth)}px`,
              height: `${Math.min(ROW_HEIGHT - 10, 36)}px`,
              opacity: 0.9,
            }}
          >
            <div className="px-2 py-1 text-[11px] truncate font-medium">
              {draggedSlot.subtitle ?? draggedSlot.title}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
