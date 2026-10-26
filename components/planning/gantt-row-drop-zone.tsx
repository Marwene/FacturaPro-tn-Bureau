"use client"

import type { ReactNode } from "react"
import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { ROW_HEIGHT } from "@/lib/planning/gantt-layout"

// ─── Drop Zone per Row ────────────────────────────────────────────
export function RowDropZone({ rowId, children }: { rowId: string; children: ReactNode }) {
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
