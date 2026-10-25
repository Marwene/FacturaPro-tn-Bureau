"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { SerializedDesignPersonnalise } from "@/lib/types"

export const queryKeys = {
  designs: () => ["designs-personnalises"] as const,
}

export function useDesignsPersonnalises() {
  return useQuery({
    queryKey: queryKeys.designs(),
    queryFn: async () => {
      const res = await fetch("/api/designs-personnalises")
      if (!res.ok) throw new Error("Erreur chargement")
      return res.json() as Promise<{ designs: SerializedDesignPersonnalise[] }>
    },
    placeholderData: (prev) => prev,
  })
}

export function useDesignPersonnaliseMutations() {
  const qc = useQueryClient()

  const saveDesign = useMutation({
    mutationFn: async (data: {
      productId: string
      variantId?: string | null
      nom: string
      layers: unknown
      thumbnail?: string | null
    }) => {
      const res = await fetch("/api/designs-personnalises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erreur") }
      return res.json() as Promise<{ design: SerializedDesignPersonnalise }>
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.designs() }),
  })

  const deleteDesign = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/designs-personnalises/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur suppression")
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.designs() }),
  })

  const updateDesign = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: {
        nom?: string
        layers?: unknown
        thumbnail?: string | null
        statut?: string
      }
    }) => {
      const res = await fetch(`/api/designs-personnalises/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erreur") }
      return res.json() as Promise<{ design: SerializedDesignPersonnalise }>
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.designs() }),
  })

  return { saveDesign, deleteDesign, updateDesign }
}
