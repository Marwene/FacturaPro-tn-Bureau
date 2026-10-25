"use client";
import { useQuery } from "@tanstack/react-query";

interface Alerte {
    effetId: string;
    numero: string;
    joursRestants: number;
    type: string;
}

export function useEffetsEcheances() {
    return useQuery({
        queryKey: ["effets-alertes"],
        queryFn: async () => {
            const res = await fetch("/api/effets/check-echeances");
            if (!res.ok) return null;
            return res.json() as Promise<{ alerts: Alerte[]; total: number }>;
        },
        refetchInterval: 300000,
    });
}
