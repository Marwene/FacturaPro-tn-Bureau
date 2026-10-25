"use client";
import { useQuery } from "@tanstack/react-query";

export function useTmmBct(enabled: boolean) {
    return useQuery<{ success: boolean; tmm: string; date: string; source: "cache" | "BCT" }>({
        queryKey: ["tmm-bct"],
        queryFn: async () => {
            const res = await fetch("/api/tmm-bct");
            if (!res.ok) throw new Error("Erreur récupération du TMM");
            return res.json();
        },
        enabled,
        retry: false,
        staleTime: 30 * 60 * 1000,
    });
}