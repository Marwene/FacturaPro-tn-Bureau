"use client"

import { useQuery } from "@tanstack/react-query"
import type { SerializedProduct } from "@/lib/types"

export interface InventaireData {
    stats: {
        totalProduits: number
        valeurStock: string
        coutTotal: string
        alertesCount: number
        rupturesCount: number
        mouvementsEntree: number
        mouvementsSortie: number
        periode: number
    }
    alertes: SerializedProduct[]
    ruptures: SerializedProduct[]
    mouvements: Array<{
        id: string
        type: string
        quantite: string
        createdAt: string
        product: { nom: string; code: string }
    }>
}

export function useRapportInventaire(periode: string) {
    return useQuery<InventaireData>({
        queryKey: ["rapport-inventaire", periode],
        queryFn: async () => {
            const res = await fetch(`/api/rapports/inventaire?periode=${periode}`)
            if (!res.ok) throw new Error("Erreur chargement")
            return res.json()
        },
    })
}
