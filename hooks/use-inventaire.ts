"use client"

import { useQuery } from "@tanstack/react-query"

export interface InventaireData {
    stats: {
        totalProduits: number
        valeurStock: string
        alertesCount: number
        rupturesCount: number
        mouvementsEntree: number
        mouvementsSortie: number
        mouvementsAjustement: number
        periode: number
    }
    categories: Array<{ id: string; nom: string; count: number; valeur: string }>
    topProduits: Array<{
        id: string
        code: string
        nom: string
        stockActuel: number
        stockMinimum: number
        stockStatus: string
        valeur: number
        prixHT: number
        categorie: string | null
    }>
    produitsAlerte: Array<{
        id: string
        code: string
        nom: string
        stockActuel: number
        stockMinimum: number
        stockStatus: string
        categorie: string | null
    }>
    mouvementsRecents: Array<{
        id: string
        type: string
        quantite: number
        date: string
        product: { id: string; code: string; nom: string } | null
    }>
}

export function useInventaire(periode: string) {
    return useQuery<InventaireData>({
        queryKey: ["inventaire", periode],
        queryFn: async () => {
            const res = await fetch(`/api/inventaire?periode=${periode}`)
            if (!res.ok) throw new Error("Erreur chargement")
            return res.json()
        },
    })
}
