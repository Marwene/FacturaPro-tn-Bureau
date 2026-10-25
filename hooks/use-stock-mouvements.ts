"use client"

import { useQuery } from "@tanstack/react-query"

export interface Mouvement {
    id: string
    type: string
    quantite: number
    notes: string | null
    date: string
    referenceType: string
    referenceId: string | null
    supplierId: string | null
    purchasePrice: number | null
    product: {
        id: string
        code: string
        nom: string
        unite: string
        stockActuel: number
        stockStatus: string
    } | null
}

export interface MouvementsData {
    mouvements: Mouvement[]
    stats: {
        total: number
        page: number
        limit: number
        totalPages: number
        entreeCount: number
        entreeSum: number
        sortieCount: number
        sortieSum: number
    }
}

export function useStockMouvements(params: URLSearchParams) {
    return useQuery<MouvementsData>({
        queryKey: ["stock-mouvements", params.toString()],
        queryFn: async () => {
            const res = await fetch(`/api/stock-mouvements?${params.toString()}`)
            if (!res.ok) throw new Error("Erreur chargement")
            return res.json()
        },
    })
}
