"use client"

import { useEffect, useCallback } from "react"
import { useCanvasStore } from "@/lib/customizer/stores/canvas-store"
import { useLayerStore } from "@/lib/customizer/stores/layer-store"

export function useCanvasKeyboardShortcuts() {
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const removeLayer = useLayerStore((s) => s.removeLayer)
  const duplicateLayer = useLayerStore((s) => s.duplicateLayer)
  const activeLayerId = useLayerStore((s) => s.activeLayerId)
  const selectedLayerIds = useCanvasStore((s) => s.selectedLayerIds)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement

      if (isInput && e.key !== "Escape") return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if (ctrl && e.key === "z" && e.shiftKey) {
        e.preventDefault()
        redo()
      }
      if (ctrl && e.key === "c") {
        e.preventDefault()
      }
      if (ctrl && e.key === "v") {
        e.preventDefault()
      }
      if (ctrl && e.key === "d") {
        e.preventDefault()
        if (activeLayerId) duplicateLayer(activeLayerId)
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedLayerIds.length > 0) {
          selectedLayerIds.forEach((id) => removeLayer(id))
        } else if (activeLayerId) {
          removeLayer(activeLayerId)
        }
      }
    },
    [undo, redo, removeLayer, duplicateLayer, activeLayerId, selectedLayerIds],
  )

  // Justification useEffect : listener clavier global (window keydown) — raccourcis du canvas (undo/redo/dupliquer/supprimer) écoutés sur window (non réactif : les touches sont produites par le navigateur hors cycle React, seul addEventListener peut les capter avec cleanup).
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
