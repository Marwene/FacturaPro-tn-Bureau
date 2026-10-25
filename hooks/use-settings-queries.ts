"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SerializedSettings } from "@/lib/types";

export function useSettings() {
    return useQuery<{ settings: SerializedSettings }>({
        queryKey: ["settings"] as const,
        queryFn: async () => {
            const res = await fetch("/api/settings");
            if (!res.ok) throw new Error("Failed to fetch settings");
            return res.json();
        },
    });
}

export function useUpdateSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (data: unknown) => {
            const res = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error ?? "Erreur mise à jour paramètres");
            }
            return res.json();
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
    });
}
