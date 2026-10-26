"use client"

import { useEffect, useRef, useState } from "react"
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import {
  minutesToX,
  type GanttViewMode,
  type TimelineRowData,
  type TimelineSlotData,
} from "@/lib/planning/gantt-layout"
import { GanttDragOverlay } from "./gantt-drag-overlay"
import { GanttHeader } from "./gantt-header"
import { GanttRowLabels } from "./gantt-row-labels"
import { GanttTimelineArea } from "./gantt-timeline-area"
import { useGanttDrag } from "./use-gantt-drag"
import { useGanttLayout } from "./use-gantt-layout"

export type { GanttViewMode, TimelineRowData, TimelineSlotData } from "@/lib/planning/gantt-layout"

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

function useCurrentTime() {
  const [now, setNow] = useState(new Date())
  // Justification useEffect : timer setInterval (60 s) — l'horloge de la timeline avance indépendamment des rendus React (non réactif : le passage du temps est un événement externe, setNow(new Date()) ne peut venir que d'un intervalle navigateur).
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])
  return now
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

  const { totalMinutes, startOffset, headerMarkers, minorLines, conflicts, slotsByRow } = useGanttLayout({
    viewMode,
    startHour,
    endHour,
    snapIntervalMinutes,
    containerWidth,
    slots,
  })

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
  )

  const {
    activeId,
    previewPos,
    draggedSlot,
    mouseTime,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  } = useGanttDrag({
    containerRef,
    scrollRef,
    containerWidth,
    totalMinutes,
    startOffset,
    snapIntervalMinutes,
    onSlotUpdate,
  })

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
        <GanttHeader
          columnWidth={columnWidth}
          headerMarkers={headerMarkers}
          scrollRef={scrollRef}
          timelineWidth={timelineWidth}
        />

        {/* Body */}
        <div className="flex">
          {/* Left column: row headers */}
          <GanttRowLabels rows={rows} slotsByRow={slotsByRow} columnWidth={columnWidth} />

          {/* Timeline area */}
          <GanttTimelineArea
            scrollRef={scrollRef}
            timelineWidth={timelineWidth}
            minorLines={minorLines}
            headerMarkers={headerMarkers}
            rows={rows}
            slotsByRow={slotsByRow}
            activeId={activeId}
            conflicts={conflicts}
            startOffset={startOffset}
            totalMinutes={totalMinutes}
            showNow={showNow}
            nowX={nowX}
            now={now}
            mouseTime={mouseTime}
            previewPos={previewPos}
            draggedSlot={draggedSlot}
          />
        </div>

        {/* Stats */}
        <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground pointer-events-none z-10">
          {slots.length} OF · {rows.length} ligne{rows.length > 1 ? "s" : ""}
        </div>
      </div>

      <GanttDragOverlay
        activeId={activeId}
        draggedSlot={draggedSlot}
        totalMinutes={totalMinutes}
        timelineWidth={timelineWidth}
      />
    </DndContext>
  )
}
