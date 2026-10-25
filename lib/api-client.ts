// lib/api-client.ts
// Client HTTP unique de l'application, adossé à `handleApiResponse` — source
// unique du mappage d'erreur (ApiError + requestId + code métier).
// À appeler depuis des hooks TanStack Query / mutations, jamais depuis le JSX.
// NOTE ( dette datée 2026-10-18, lot F.3 ) : aucun consommateur pour l'instant ;
// la migration des appels `fetch()` dispersés vers `apiFetch` est planifiée au
// lot F.3 de l'audit 2026-10.

import { handleApiResponse } from "@/lib/api-error";

export type ApiFetchOptions = {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    /** Corps JSON serialisé automatiquement ; `FormData` transmis tel quel. */
    body?: unknown;
    headers?: HeadersInit;
    signal?: AbortSignal;
    /** Contexte métier repris dans le message d'erreur de repli (ex. « chargement clients »). */
    context?: string;
};

export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
    const { method = "GET", body, headers, signal, context = "requête" } = options;

    const init: RequestInit = { method, signal };
    if (body !== undefined) {
        if (typeof FormData !== "undefined" && body instanceof FormData) {
            init.body = body;
            if (headers) init.headers = headers;
        } else {
            init.body = JSON.stringify(body);
            init.headers = { "Content-Type": "application/json", ...headers };
        }
    } else if (headers) {
        init.headers = headers;
    }

    const res = await fetch(url, init);
    return handleApiResponse<T>(res, context);
}
