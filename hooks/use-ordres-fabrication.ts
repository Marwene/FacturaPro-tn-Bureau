"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys as rootQueryKeys } from "@/lib/query-keys"
import type { SerializedOrdreFabrication } from "@/lib/types"

export const queryKeys = {
  ordres: () => ["ordres-fabrication"] as const,
  ordre: (id: string) => ["ordres-fabrication", id] as const,
}

export interface OFProductOption {
  id: string
  code: string
  nom: string
  categorieName?: string | null
}

/**
 * Liste produits du sélecteur du dialog « Nouvel OF » (ex-useEffect fetch
 * `/api/products?limit=500` à chaque `open`) : mêmes déclencheurs
 * (`enabled: open`), staleTime 0 = re-fetch à chaque réouverture comme
 * l'ex-effet, retry false = l'ex-.catch silencieux (1 tentative unique).
 * `data ?? []` ≡ l'ex-état local : à la réouverture la liste se sert du cache
 * pendant la revalidation.
 */
export function useOFProductsSelect(open: boolean) {
  return useQuery<OFProductOption[]>({
    queryKey: rootQueryKeys.bonsCommande.produitsSelect(500),
    queryFn: async () => {
      const res = await fetch("/api/products?limit=500")
      const data = (await res.json()) as { products?: OFProductOption[] }
      return data.products ?? []
    },
    enabled: open,
    staleTime: 0,
    retry: false,
  })
}

export function useOrdresFabrication(statut?: string, search?: string) {
  const params = new URLSearchParams()
  if (statut) params.set("statut", statut)
  if (search) params.set("search", search)
  const qs = params.toString()

  return useQuery({
    queryKey: [...queryKeys.ordres(), qs],
    queryFn: async () => {
      const res = await fetch(`/api/ordres-fabrication${qs ? `?${qs}` : ""}`)
      if (!res.ok) throw new Error("Erreur chargement")
      return res.json() as Promise<{ ordres: SerializedOrdreFabrication[] }>
    },
    placeholderData: (prev) => prev,
  })
}

export function useOrdreFabrication(id: string) {
  return useQuery({
    queryKey: queryKeys.ordre(id),
    queryFn: async () => {
      const res = await fetch(`/api/ordres-fabrication/${id}`)
      if (!res.ok) throw new Error("Erreur chargement")
      return res.json() as Promise<{ ordre: SerializedOrdreFabrication }>
    },
    enabled: !!id,
  })
}

export function useOrdreFabricationMutations() {
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/ordres-fabrication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erreur") }
      return res.json()
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.ordres() }),
  })

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/ordres-fabrication/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Erreur") }
      return res.json()
    },
    onSettled: (_r, _e, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.ordres() })
      qc.invalidateQueries({ queryKey: queryKeys.ordre(vars.id) })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ordres-fabrication/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Erreur suppression")
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.ordres() }),
  })

  const genererFiche = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ordres-fabrication/${id}/fiche-technique`, { method: "POST" })
      if (!res.ok) throw new Error("Erreur génération fiche technique")
      return res.json() as Promise<{ url: string }>
    },
    onSettled: (_r, _e, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.ordre(id) })
    },
  })

  function openFicheTechnique(id: string) {
    window.open(`/api/ordres-fabrication/${id}/fiche-technique`, "_blank")
  }

  return { create, update, remove, genererFiche, openFicheTechnique }
}
