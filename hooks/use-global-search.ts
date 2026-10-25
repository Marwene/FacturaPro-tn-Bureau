"use client";

import { useQuery } from "@tanstack/react-query";
import { handleApiResponse } from "@/lib/api-error";
import { queryKeys } from "@/lib/query-keys";
import type { SearchGroup } from "@/lib/search";

/**
 * Recherche globale (palette de commandes).
 *
 * `queryKey` reprend les 3 dépendances exactes de l'ex-effet (deferredQuery,
 * currentModule, selectedModule) → mêmes déclencheurs, aucune clé distincte en
 * plus ; `enabled` reprend sa garde `deferredQuery.trim()` ; `placeholderData`
 * conserve les résultats précédents pendant le fetch (l'ex-effet ne vidait
 * `groups` qu'à la requête vide) ; staleTime 0 parce que l'ex-effet refaisait
 * l'appel à chaque changement de dépendances.
 */
export function useGlobalSearch(
  query: string,
  currentModule: string | null,
  selectedModule: string | null,
) {
  const enabled = query.trim().length > 0;

  return useQuery({
    queryKey: queryKeys.search.global(query, currentModule, selectedModule),
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (currentModule) params.set("module", currentModule);
      const res = await fetch(`/api/search?${params}`);
      const data = await handleApiResponse<{ groups: SearchGroup[] }>(res, "recherche globale");
      return data.groups;
    },
    enabled,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
}
