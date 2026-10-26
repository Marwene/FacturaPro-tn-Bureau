"use client"

import type { RefObject } from "react"
import { cn } from "@/lib/utils"
import { HEADER_HEIGHT, type GanttHeaderMarker } from "@/lib/planning/gantt-layout"

interface GanttHeaderProps {
  columnWidth: number
  headerMarkers: GanttHeaderMarker[]
  scrollRef: RefObject<HTMLDivElement | null>
  timelineWidth: number
}

export function GanttHeader({ columnWidth, headerMarkers, scrollRef, timelineWidth }: GanttHeaderProps) {
  return (
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
  )
}
