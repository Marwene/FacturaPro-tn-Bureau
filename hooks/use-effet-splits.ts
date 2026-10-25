"use client";
import { useQuery } from "@tanstack/react-query";
import type { SerializedEffet } from "@/lib/types";

export function useEffetSplits(effetId: string) {
    return useQuery({
        queryKey: ["effet-splits", effetId],
        queryFn: async () => {
            const params = new URLSearchParams({ effetId });
            const res = await fetch(`/api/effets/splits?${params}`);
            if (!res.ok) return { effets: [] as SerializedEffet[] };
            return res.json() as Promise<{ effets: SerializedEffet[] }>;
        },
        enabled: !!effetId,
    });
}
