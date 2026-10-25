import { create } from "zustand"
import type { DesignLayer } from "../types/product-customizer"

interface LayerStore {
  layers: DesignLayer[]
  activeLayerId: string | null

  setLayers: (layers: DesignLayer[]) => void
  addLayer: (layer: DesignLayer) => void
  updateLayer: (id: string, updates: Partial<DesignLayer>) => void
  removeLayer: (id: string) => void
  duplicateLayer: (id: string) => void
  reorderLayer: (fromIndex: number, toIndex: number) => void
  setActiveLayer: (id: string | null) => void
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  moveLayerToTop: (id: string) => void
  moveLayerToBottom: (id: string) => void
  toggleLayerVisibility: (id: string) => void
  toggleLayerLock: (id: string) => void
  renameLayer: (id: string, name: string) => void
}

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: [],
  activeLayerId: null,

  setLayers: (layers) => set({ layers }),

  addLayer: (layer) =>
    set((state) => ({
      layers: [...state.layers, layer],
      activeLayerId: layer.id,
    })),

  updateLayer: (id, updates) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      activeLayerId: state.activeLayerId === id ? null : state.activeLayerId,
    })),

  duplicateLayer: (id) =>
    set((state) => {
      const source = state.layers.find((l) => l.id === id)
      if (!source) return state
      const dup: DesignLayer = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (copie)`,
        position: { x: source.position.x + 20, y: source.position.y + 20 },
        zIndex: Math.max(...state.layers.map((l) => l.zIndex), 0) + 1,
      }
      return { layers: [...state.layers, dup], activeLayerId: dup.id }
    }),

  reorderLayer: (fromIndex, toIndex) =>
    set((state) => {
      const layers = [...state.layers]
      const [moved] = layers.splice(fromIndex, 1)
      layers.splice(toIndex, 0, moved)
      return {
        layers: layers.map((l, i) => ({ ...l, zIndex: i })),
      }
    }),

  setActiveLayer: (id) => set({ activeLayerId: id }),

  moveLayerUp: (id) => {
    const { layers } = get()
    const idx = layers.findIndex((l) => l.id === id)
    if (idx >= layers.length - 1) return
    get().reorderLayer(idx, idx + 1)
  },

  moveLayerDown: (id) => {
    const { layers } = get()
    const idx = layers.findIndex((l) => l.id === id)
    if (idx <= 0) return
    get().reorderLayer(idx, idx - 1)
  },

  moveLayerToTop: (id) => {
    const { layers } = get()
    const idx = layers.findIndex((l) => l.id === id)
    if (idx < 0) return
    get().reorderLayer(idx, layers.length - 1)
  },

  moveLayerToBottom: (id) => {
    const { layers } = get()
    const idx = layers.findIndex((l) => l.id === id)
    if (idx < 0) return
    get().reorderLayer(idx, 0)
  },

  toggleLayerVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      ),
    })),

  toggleLayerLock: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, locked: !l.locked } : l,
      ),
    })),

  renameLayer: (id, name) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, name } : l)),
    })),
}))
