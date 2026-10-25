"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * StaleTime presets — adaptées au taux de changement des données.
 * - STATIC   : référentiels quasi-immuables (catégories, marques, carton-types)
 * - SLOW     : données métier stables (clients, fournisseurs, produits)
 * - MEDIUM   : documents transactionnels (devis, factures, BC, BL)
 * - FAST     : états volatils (stock, trésorerie, notifications)
 */
export const STALE_TIMES = {
    STATIC: 1000 * 60 * 30,       // 30 min
    SLOW: 1000 * 60 * 10,         // 10 min
    MEDIUM: 1000 * 60 * 2,        // 2 min
    FAST: 1000 * 30,              // 30 sec
} as const;

export const GC_TIMES = {
    STATIC: 1000 * 60 * 60 * 2,   // 2 h
    SLOW: 1000 * 60 * 30,         // 30 min
    MEDIUM: 1000 * 60 * 10,       // 10 min
    FAST: 1000 * 60 * 5,          // 5 min
} as const;

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: STALE_TIMES.MEDIUM,
                        gcTime: GC_TIMES.MEDIUM,
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                    mutations: {
                        retry: 0,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
