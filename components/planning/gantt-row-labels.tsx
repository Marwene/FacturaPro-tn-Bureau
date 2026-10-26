"use client"

import { ROW_HEIGHT, type TimelineRowData, type TimelineSlotData } from "@/lib/planning/gantt-layout"

interface GanttRowLabelsProps {
  rows: TimelineRowData[]
  slotsByRow: Record<string, TimelineSlotData[]>
  columnWidth: number
}

export function GanttRowLabels({ rows, slotsByRow, columnWidth }: GanttRowLabelsProps) {
  return (
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
  )
}
