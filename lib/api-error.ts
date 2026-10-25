// lib/api-error.ts
// Classe d'erreur standardisée pour les appels API côté client

export class ApiError extends Error {
    public readonly status: number;
    public readonly statusText: string;
    public readonly body?: unknown;
    /** Identifiant de trace retourné par le serveur (`requestId` du body, si présent). */
    public readonly requestId?: string;
    /** Code métier structuré retourné par le serveur (`code` du body, si présent). */
    public readonly code?: string;

    constructor(
        status: number,
        statusText: string,
        body?: unknown,
        meta?: { requestId?: string; code?: string },
    ) {
        super(`API Error ${status}: ${statusText}`);
        this.name = "ApiError";
        this.status = status;
        this.statusText = statusText;
        this.body = body;
        this.requestId = meta?.requestId;
        this.code = meta?.code;
    }
}

/**
 * Lit les métadonnées d'erreur structurées (`requestId`, `code` métier) d'un
 * corps de réponse JSON. Extension rétro-compatible : `undefined` si absent ou
 * de mauvais type, jamais d'erreur levée.
 */
export function readApiErrorMeta(body: unknown): { requestId?: string; code?: string } {
    if (typeof body !== "object" || body === null) return {};
    const record = body as Record<string, unknown>;
    return {
        requestId: typeof record.requestId === "string" ? record.requestId : undefined,
        code: typeof record.code === "string" ? record.code : undefined,
    };
}

/**
 * Gère la réponse d'une requête fetch API.
 * Lance une ApiError si la réponse n'est pas ok.
 *
 * @param res - La réponse fetch
 * @param context - Contexte pour le message d'erreur (ex: "chargement clients")
 * @returns La réponse parsée en JSON
 */
export async function handleApiResponse<T>(res: Response, context: string): Promise<T> {
    if (!res.ok) {
        let body: unknown;
        try {
            body = await res.json();
        } catch {
            // La réponse n'est pas du JSON, on garde le statusText
        }

        const message =
            body && typeof body === "object" && "error" in body
                ? String((body as { error: unknown }).error)
                : `Erreur ${context}`;

        throw new ApiError(res.status, message, body, readApiErrorMeta(body));
    }

    return res.json() as Promise<T>;
}

/**
 * Extrait le message d'erreur (`{ error: string }`) d'un corps de réponse API.
 * Contrairement au fallback de `handleApiResponse`, retourne `undefined`
 * quand aucun message exploitable n'est présent — contrats volontairement distincts.
 */
export function readApiErrorMessage(body: unknown): string | undefined {
    if (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof body.error === "string"
    ) {
        return body.error;
    }
    return undefined;
}

export class ChangePasswordError extends Error {
    readonly description: string | undefined;

    constructor(description?: string) {
        super(description);
        this.name = "ChangePasswordError";
        this.description = description;
    }
}
