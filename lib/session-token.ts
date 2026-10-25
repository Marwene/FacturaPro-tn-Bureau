import { decode, encode, type JWT } from "next-auth/jwt";

/**
 * S-1 — Dérivation du salt JWT depuis le nom du cookie réellement lu.
 *
 * Auth.js utilise le NOM du cookie de session comme salt de dérivation du salt
 * de chiffrement du JWT. Historiquement, le code décodait toujours avec le salt
 * fixe "authjs.session-token" alors que le cookie réellement présent pouvait
 * être "__Secure-authjs.session-token" (production HTTPS) → déchiffrement
 * impossible. Ce module est la source unique de vérité pour lire le cookie et
 * dériver le salt, utilisée par proxy.ts ET lib/session.ts (zéro duplication).
 */
export const SESSION_COOKIE_NAME = "authjs.session-token";
export const SECURE_SESSION_COOKIE_NAME = "__Secure-authjs.session-token";

export type SessionCookieName = typeof SESSION_COOKIE_NAME | typeof SECURE_SESSION_COOKIE_NAME;

/** Token de session + nom du cookie d'origine (le nom sert de salt JWT). */
export interface SessionTokenSource {
    token: string;
    cookieName: SessionCookieName;
}

/** Minimal structural type couvrant `NextRequest.cookies` et `cookies()` (next/headers). */
export interface CookieReader {
    get(name: string): { value: string } | undefined;
}

interface MaybeCookieReader {
    cookies?: unknown;
}

function isCookieReader(value: unknown): value is CookieReader {
    if (typeof value !== "object" || value === null) return false;
    return typeof (value as { get?: unknown }).get === "function";
}

/** Source unique de la clé de signature (exportée pour `lib/session-marker.ts` — aucune duplication). */
export function authSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET manquant");
    return secret;
}

/**
 * Lit le cookie de session via un accesseur `get(name)` — compatible
 * `NextRequest.cookies` et `cookies()` de `next/headers`.
 * Le cookie `__Secure-` (prod HTTPS) est prioritaire ; sinon cookie nu (local).
 */
export function readSessionToken(cookies: CookieReader): SessionTokenSource | null {
    const secure = cookies.get(SECURE_SESSION_COOKIE_NAME);
    if (secure?.value) return { token: secure.value, cookieName: SECURE_SESSION_COOKIE_NAME };

    const plain = cookies.get(SESSION_COOKIE_NAME);
    if (plain?.value) return { token: plain.value, cookieName: SESSION_COOKIE_NAME };

    return null;
}

/** Fallback pour un `Request` sans accesseur cookies : parse l'en-tête Cookie brut. */
export function readSessionTokenFromCookieHeader(cookieHeader: string | null): SessionTokenSource | null {
    const raw = new Map<string, string>();
    for (const segment of cookieHeader?.split(";") ?? []) {
        const separator = segment.indexOf("=");
        if (separator < 0) continue;
        raw.set(segment.slice(0, separator).trim(), segment.slice(separator + 1).trim());
    }
    return readSessionToken({
        get: (name: string) => (raw.has(name) ? { value: raw.get(name) ?? "" } : undefined),
    });
}

/**
 * Source unique de lecture : utilise `request.cookies` quand présent
 * (NextRequest), sinon parse l'en-tête Cookie (Request nu, ex: pages qui
 * reconstruisent la requête depuis `headers()`).
 */
export function readSessionTokenFromRequest(request: Request): SessionTokenSource | null {
    const jar = (request as Request & MaybeCookieReader).cookies;
    if (isCookieReader(jar)) return readSessionToken(jar);
    return readSessionTokenFromCookieHeader(request.headers.get("cookie"));
}

/**
 * Décode le JWT avec le salt dérivé du nom du cookie réellement lu.
 * Échec (mauvais salt, token altéré, expiré…) → null, jamais de throw.
 */
export async function decodeSessionToken(source: SessionTokenSource): Promise<JWT | null> {
    try {
        return await decode({
            token: source.token,
            secret: authSecret(),
            salt: source.cookieName,
        });
    } catch {
        return null;
    }
}

/** Encode un JWT de session avec le salt correspondant au nom de cookie cible (symétrique de decodeSessionToken — utilisé par les tests). */
export async function encodeSessionToken(payload: JWT, cookieName: SessionCookieName): Promise<string> {
    return encode({ token: payload, secret: authSecret(), salt: cookieName });
}
