"use client"

import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { ROW_HEIGHT, type TimelineSlotData } from "@/lib/planning/gantt-layout"

// ─── Slot Component ───────────────────────────────────────────────
export function TimelineSlot({
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
