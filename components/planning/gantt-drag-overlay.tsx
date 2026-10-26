"use client"

import { DragOverlay } from "@dnd-kit/core"
import { ROW_HEIGHT, type TimelineSlotData } from "@/lib/planning/gantt-layout"

interface GanttDragOverlayProps {
  activeId: string | null
  draggedSlot: TimelineSlotData | null
  totalMinutes: number
  timelineWidth: number
}

export function GanttDragOverlay({ activeId, draggedSlot, totalMinutes, timelineWidth }: GanttDragOverlayProps) {
  return (
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
  )
}
