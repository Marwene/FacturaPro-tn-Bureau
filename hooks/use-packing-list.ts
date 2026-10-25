"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { SerializedPackingList } from "@/lib/types"

export const queryKeys = {
  packingLists: () => ["packing-lists"] as const,
  packingList: (id: string) => ["packing-lists", id] as const,
}

export function usePackingLists(statut?: string, search?: string) {
  const params = new URLSearchParams()
  if (statut) params.set("statut", statut)
  if (search) params.set("search", search)
  const qs = params.toString()

  return useQuery({
    queryKey: [...queryKeys.packingLists(), qs],
    queryFn: async () => {
      const res = await fetch(`/api/packing-list${qs ? `?${qs}` : ""}`)
      if (!res.ok) throw new Error("Erreur chargement")
      return res.json() as Promise<{ packingLists: SerializedPackingList[] }>
    },
    placeholderData: (prev) => prev,
  })
}

export function usePackingList(id: string) {
  return useQuery({
    queryKey: queryKeys.packingList(id),
    queryFn: async () => {
      const res = await fetch(`/api/packing-list/${id}`)
      if (!res.ok) throw new Error("Erreur chargement")
      return res.json() as Promise<{ packingList: SerializedPackingList }>
    },
    enabled: !!id,
  })
}

export function usePackingListMutations() {
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/packing-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erreur")
      }
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.packingLists() }),
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/packing-list/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Erreur suppression")
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.packingLists() }),
  })

  function openPdf(id: string) {
    window.open(`/api/packing-list/${id}/pdf`, "_blank")
  }

  function openEtiquettes(id: string, format: "tsc200" | "a4" = "tsc200") {
    window.open(`/api/packing-list/${id}/etiquettes?format=${format}`, "_blank")
  }

  return { create, remove, openPdf, openEtiquettes }
}
