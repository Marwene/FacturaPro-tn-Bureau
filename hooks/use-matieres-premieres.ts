"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { SerializedMatierePremiere } from "@/lib/types"

export const queryKeys = {
  matieres: () => ["matieres-premieres"] as const,
  matiere: (id: string) => ["matieres-premieres", id] as const,
}

export function useMatieresPremieres(type?: string, search?: string) {
  const params = new URLSearchParams()
  if (type) params.set("type", type)
  if (search) params.set("search", search)
  const qs = params.toString()

  return useQuery({
    queryKey: [...queryKeys.matieres(), qs],
    queryFn: async () => {
      const res = await fetch(`/api/matieres-premieres${qs ? `?${qs}` : ""}`)
      if (!res.ok) throw new Error("Erreur chargement")
      return res.json() as Promise<{ matieres: SerializedMatierePremiere[] }>
    },
    placeholderData: (prev) => prev,
  })
}

export function useMatierePremiere(id: string) {
  return useQuery({
    queryKey: queryKeys.matiere(id),
    queryFn: async () => {
      const res = await fetch(`/api/matieres-premieres/${id}`)
      if (!res.ok) throw new Error("Erreur chargement")
      return res.json() as Promise<{ matiere: SerializedMatierePremiere }>
    },
    enabled: !!id,
  })
}

export function useMatierePremiereMutations() {
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/matieres-premieres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erreur") }
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.matieres() }),
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/matieres-premieres/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erreur") }
      return res.json()
    },
    onSettled: (_r, _e, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.matieres() })
      qc.invalidateQueries({ queryKey: queryKeys.matiere(vars.id) })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/matieres-premieres/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur suppression")
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.matieres() }),
  })

  return { create, update, remove }
}
