"use client"

import { useCallback, useState, type RefObject } from "react"
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core"
import {
  minutesToTime,
  minutesToX,
  snapDragMinutes,
  timeToMinutes,
  type TimelineSlotData,
} from "@/lib/planning/gantt-layout"

interface UseGanttDragOptions {
  containerRef: RefObject<HTMLDivElement | null>
  scrollRef: RefObject<HTMLDivElement | null>
  containerWidth: number
  totalMinutes: number
  startOffset: number
  snapIntervalMinutes: number
  onSlotUpdate: (slotId: string, newStartTime: string, newRowId: string) => void
}

export function useGanttDrag({
  containerRef,
  scrollRef,
  containerWidth,
  totalMinutes,
  startOffset,
  snapIntervalMinutes,
  onSlotUpdate,
}: UseGanttDragOptions) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [previewPos, setPreviewPos] = useState<{ left: number; width: number; rowId: string } | null>(null)
  const [draggedSlot, setDraggedSlot] = useState<TimelineSlotData | null>(null)
  const [mouseTime, setMouseTime] = useState<string | null>(null)

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
    const snapped = snapDragMinutes(newLeft, containerWidth, totalMinutes, snapIntervalMinutes, startOffset)
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
  }, [containerWidth, totalMinutes, startOffset, snapIntervalMinutes, draggedSlot, containerRef, scrollRef])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const slot = event.active.data.current?.slot as TimelineSlotData
    if (!slot) { clear(); return }

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      // Calculate original slot position, then add drag delta for new position
      const origStartMin = timeToMinutes(slot.startTime)
      const origLeft = minutesToX(origStartMin, startOffset, totalMinutes, containerWidth)
      const newLeft = origLeft + event.delta.x
      const snapped = snapDragMinutes(newLeft, containerWidth, totalMinutes, snapIntervalMinutes, startOffset)
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
  }, [containerWidth, totalMinutes, snapIntervalMinutes, startOffset, onSlotUpdate, containerRef, scrollRef])

  const handleDragCancel = useCallback(() => {
    setActiveId(null); setDraggedSlot(null); setPreviewPos(null); setMouseTime(null)
  }, [])

  return {
    activeId,
    previewPos,
    draggedSlot,
    mouseTime,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  }
}
