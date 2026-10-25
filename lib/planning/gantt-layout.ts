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

export interface GanttTimeRange {
  start: Date
  totalMinutes: number
}

export interface GanttHeaderMarker {
  label: string
  sublabel?: string
  left: number
  isMajor: boolean
}

export interface GanttSlotBounds {
  left: number
  width: number
}

export const ROW_HEIGHT = 56
export const HEADER_HEIGHT = 44

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

export function minutesToX(minutes: number, startMin: number, totalMin: number, width: number): number {
  return ((minutes - startMin) / totalMin) * width
}

export function computeTimeRange(
  viewMode: GanttViewMode,
  today: Date,
  startHour: number,
  endHour: number,
): GanttTimeRange {
  if (viewMode === "day") {
    return { start: today, totalMinutes: (endHour - startHour) * 60 }
  }
  if (viewMode === "week") {
    const d = new Date(today)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return { start: d, totalMinutes: 7 * 24 * 60 }
  }
  return { start: new Date(today.getFullYear(), today.getMonth(), 1), totalMinutes: 28 * 24 * 60 }
}

export function computeHeaderMarkers(
  viewMode: GanttViewMode,
  startHour: number,
  endHour: number,
  startOffset: number,
  totalMinutes: number,
  containerWidth: number,
  timeRange: GanttTimeRange,
): GanttHeaderMarker[] {
  const markers: GanttHeaderMarker[] = []
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
}

export function computeMinorLines(
  viewMode: GanttViewMode,
  startHour: number,
  endHour: number,
  snapIntervalMinutes: number,
  startOffset: number,
  totalMinutes: number,
  containerWidth: number,
): number[] {
  if (viewMode !== "day") return []
  const lines: number[] = []
  for (let m = startHour * 60 + snapIntervalMinutes; m < endHour * 60; m += snapIntervalMinutes) {
    if (m % 60 !== 0) lines.push(minutesToX(m, startOffset, totalMinutes, containerWidth))
  }
  return lines
}

export function groupSlotsByRow(slots: TimelineSlotData[]): Record<string, TimelineSlotData[]> {
  const grouped: Record<string, TimelineSlotData[]> = {}
  for (const s of slots) {
    if (!grouped[s.rowId]) grouped[s.rowId] = []
    grouped[s.rowId].push(s)
  }
  return grouped
}

export function computeConflictIds(slots: TimelineSlotData[]): Set<string> {
  const ids = new Set<string>()
  const byRow = groupSlotsByRow(slots)
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
}

export function slotBounds(
  startMin: number,
  duration: number,
  startOffset: number,
  totalMinutes: number,
  width: number,
): GanttSlotBounds {
  const left = minutesToX(startMin, startOffset, totalMinutes, width)
  const right = minutesToX(startMin + duration, startOffset, totalMinutes, width)
  return { left, width: right - left }
}

export function snapDragMinutes(
  newLeft: number,
  containerWidth: number,
  totalMinutes: number,
  snapIntervalMinutes: number,
  startOffset: number,
): number {
  const relMin = (newLeft / containerWidth) * totalMinutes
  return Math.round(relMin / snapIntervalMinutes) * snapIntervalMinutes + startOffset
}
