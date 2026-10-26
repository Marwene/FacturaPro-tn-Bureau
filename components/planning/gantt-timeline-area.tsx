"use client"

import type { RefObject } from "react"
import {
  ROW_HEIGHT,
  minutesToX,
  slotBounds,
  timeToMinutes,
  type GanttHeaderMarker,
  type TimelineRowData,
  type TimelineSlotData,
} from "@/lib/planning/gantt-layout"
import { RowDropZone } from "./gantt-row-drop-zone"
import { TimelineSlot } from "./gantt-timeline-slot"

interface GanttTimelineAreaProps {
  scrollRef: RefObject<HTMLDivElement | null>
  timelineWidth: number
  minorLines: number[]
  headerMarkers: GanttHeaderMarker[]
  rows: TimelineRowData[]
  slotsByRow: Record<string, TimelineSlotData[]>
  activeId: string | null
  conflicts: Set<string>
  startOffset: number
  totalMinutes: number
  showNow: boolean
  nowX: number
  now: Date
  mouseTime: string | null
  previewPos: { left: number; width: number; rowId: string } | null
  draggedSlot: TimelineSlotData | null
}

export function GanttTimelineArea({
  scrollRef,
  timelineWidth,
  minorLines,
  headerMarkers,
  rows,
  slotsByRow,
  activeId,
  conflicts,
  startOffset,
  totalMinutes,
  showNow,
  nowX,
  now,
  mouseTime,
  previewPos,
  draggedSlot,
}: GanttTimelineAreaProps) {
  return (
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
                const { left, width: w } = slotBounds(startMin, slot.duration, startOffset, totalMinutes, timelineWidth)
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
  )
}
