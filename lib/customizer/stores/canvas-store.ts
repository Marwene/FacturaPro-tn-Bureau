import { create } from "zustand"
import type { CanvasView, CanvasSettings } from "../types/product-customizer"

interface CanvasHistoryEntry {
  layers: string
}

interface CanvasStore {
  zoom: number
  panX: number
  panY: number
  selectedLayerIds: string[]
  currentView: CanvasView
  history: CanvasHistoryEntry[]
  historyIndex: number
  settings: CanvasSettings

  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  setCurrentView: (view: CanvasView) => void
  setSelectedLayerIds: (ids: string[]) => void
  toggleLayerSelection: (id: string) => void
  clearSelection: () => void

  pushHistory: (entry: CanvasHistoryEntry) => void
  undo: () => CanvasHistoryEntry | null
  redo: () => CanvasHistoryEntry | null
  canUndo: () => boolean
  canRedo: () => boolean

  updateSettings: (settings: Partial<CanvasSettings>) => void
}

const defaultSettings: CanvasSettings = {
  gridSize: 10,
  snapToGrid: true,
  snapThreshold: 5,
  showGuides: false,
  showRulers: false,
  showSafeAreas: false,
  showPrintAreas: false,
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedLayerIds: [],
  currentView: "front",
  history: [],
  historyIndex: -1,
  settings: defaultSettings,

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setCurrentView: (view) => set({ currentView: view, selectedLayerIds: [] }),

  setSelectedLayerIds: (ids) => set({ selectedLayerIds: ids }),
  toggleLayerSelection: (id) =>
    set((state) => ({
      selectedLayerIds: state.selectedLayerIds.includes(id)
        ? state.selectedLayerIds.filter((i) => i !== id)
        : [...state.selectedLayerIds, id],
    })),
  clearSelection: () => set({ selectedLayerIds: [] }),

  pushHistory: (entry) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(entry)
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    }),

  undo: () => {
    const { historyIndex, history } = get()
    if (historyIndex < 0) return null
    const newIndex = historyIndex - 1
    set({ historyIndex: newIndex })
    return history[newIndex] ?? null
  },

  redo: () => {
    const { historyIndex, history } = get()
    if (historyIndex >= history.length - 1) return null
    const newIndex = historyIndex + 1
    set({ historyIndex: newIndex })
    return history[newIndex] ?? null
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),
}))
