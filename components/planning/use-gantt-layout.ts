"use client"

import { useMemo } from "react"
import {
  computeConflictIds,
  computeHeaderMarkers,
  computeMinorLines,
  computeTimeRange,
  groupSlotsByRow,
  type GanttHeaderMarker,
  type GanttViewMode,
  type TimelineSlotData,
} from "@/lib/planning/gantt-layout"

interface UseGanttLayoutOptions {
  viewMode: GanttViewMode
  startHour: number
  endHour: number
  snapIntervalMinutes: number
  containerWidth: number
  slots: TimelineSlotData[]
}

interface GanttLayout {
  totalMinutes: number
  startOffset: number
  headerMarkers: GanttHeaderMarker[]
  minorLines: number[]
  conflicts: Set<string>
  slotsByRow: Record<string, TimelineSlotData[]>
}

export function useGanttLayout({
  viewMode,
  startHour,
  endHour,
  snapIntervalMinutes,
  containerWidth,
  slots,
}: UseGanttLayoutOptions): GanttLayout {
  // Determine time range based on viewMode
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])

  const timeRange = useMemo(
    () => computeTimeRange(viewMode, today, startHour, endHour),
    [today, viewMode, startHour, endHour],
  )

  const totalMinutes = timeRange.totalMinutes
  const startOffset = viewMode === "day" ? startHour * 60 : 0

  // Build header markers
  const headerMarkers = useMemo(
    () => computeHeaderMarkers(viewMode, startHour, endHour, startOffset, totalMinutes, containerWidth, timeRange),
    [viewMode, startHour, endHour, startOffset, totalMinutes, containerWidth, timeRange],
  )

  // Grid lines
  const minorLines = useMemo(
    () => computeMinorLines(viewMode, startHour, endHour, snapIntervalMinutes, startOffset, totalMinutes, containerWidth),
    [viewMode, startHour, endHour, snapIntervalMinutes, startOffset, totalMinutes, containerWidth],
  )

  // Conflict detection
  const conflicts = useMemo(() => computeConflictIds(slots), [slots])

  const slotsByRow = useMemo(() => groupSlotsByRow(slots), [slots])

  return { totalMinutes, startOffset, headerMarkers, minorLines, conflicts, slotsByRow }
}
