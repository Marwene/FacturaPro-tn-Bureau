/**
 * Rate limiting pour les routes d'authentification publiques.
 *
 * Mécanisme : fenêtre FIXE comptée en PostgreSQL (modèle `RateLimitBucket`,
 * table `rate_limit_buckets`) — un upsert atomique `INSERT … ON CONFLICT` par
 * tentative, sans TOCTOU. Choix d'architecture : zéro dépendance npm nouvelle,
 * état partagé entre instances serverless (Vercel) via la seule base déjà
 * utilisée par `authorize()`.
 *   - Redis/Upstash écarté : nouvelle dépendance + nouvel infra à opérer.
 *   - In-memory écarté : état par instance (cold start, multi-instances).
 *
 * Fail-open : toute erreur du store autorise la requête (console.warn bref) —
 * si la DB tombe, `authorize()` échoue déjà de toute façon.
 *
 * Purge opportuniste : au plus 1 DELETE toutes les 5 minutes (compteur en
 * mémoire de module), les buckets de plus de 24 h sont supprimés. Pas de cron.
 *
 * NOTE `apiRoute` non applicable : les 5 endpoints protégés ici sont PUBLICS
 * par nature (appelés sans session — connexion, inscription, vérification
 * email, check-status), alors que `lib/api-route.ts` impose `session?.id` et
 * répondrait 401 sur chacun d'eux. Voir `docs/wiki/auth.md` (section
 * « Rate limiting »).
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/schemas";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RateLimitOptions = { limit: number; windowMs: number };

export type RateLimitDecision =
    | { ok: true; remaining: number; resetAt: Date }
    | { ok: false; retryAfterSeconds: number };

/** Sous-union bloquée — utilisée pour typer `rateLimitResponse` sans n'importe quel type. */
export type RateLimitBlocked = Extract<RateLimitDecision, { ok: false }>;

/** Dimension d'une clé : IP du client, email du compte, ou compte (email de connexion). */
export type RateLimitDimension = "ip" | "email" | "account";

export interface RateLimitStore {
    /** Incrémente (ou crée) le compteur de la fenêtre et retourne le nouveau count. */
    increment(key: string, windowStart: Date): Promise<number>;
    /** Supprime le compteur (remise à zéro, ex. login réussi). */
    clear(key: string): Promise<void>;
    /** Supprime les buckets dont la fenêtre est antérieure à `cutoff`. */
    purgeOlderThan(cutoff: Date): Promise<void>;
}

// ─── Seuils (constantes nommées — voir tableau dans docs/wiki/auth.md) ───────

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** POST /api/auth/[...nextauth] (connexion) — par IP : 15 tentatives / 5 minutes. */
export const NEXTAUTH_IP_LIMIT: RateLimitOptions = { limit: 15, windowMs: 5 * MINUTE };

/** Connexion — par compte (email) : 10 tentatives / 15 minutes,
 *  remis à zéro à chaque login réussi (`clearRateLimit` dans `authorize()`). */
export const LOGIN_ACCOUNT_LIMIT: RateLimitOptions = { limit: 10, windowMs: 15 * MINUTE };

/** POST /api/auth/register — par IP : 5 inscriptions / heure. */
export const REGISTER_IP_LIMIT: RateLimitOptions = { limit: 5, windowMs: HOUR };

/** POST /api/auth/resend-code — par IP : 10 tentatives / heure. */
export const RESEND_CODE_IP_LIMIT: RateLimitOptions = { limit: 10, windowMs: HOUR };

/** POST /api/auth/resend-code — par email : 5 tentatives / heure. */
export const RESEND_CODE_EMAIL_LIMIT: RateLimitOptions = { limit: 5, windowMs: HOUR };

/** POST /api/users/check-status — par IP : 30 tentatives / 5 minutes. */
export const CHECK_STATUS_IP_LIMIT: RateLimitOptions = { limit: 30, windowMs: 5 * MINUTE };

/** POST /api/users/verify-email — par IP : 15 tentatives / 15 minutes. */
export const VERIFY_EMAIL_IP_LIMIT: RateLimitOptions = { limit: 15, windowMs: 15 * MINUTE };

/** POST /api/users/verify-email — par email : 10 tentatives / 15 minutes. */
export const VERIFY_EMAIL_EMAIL_LIMIT: RateLimitOptions = { limit: 10, windowMs: 15 * MINUTE };

/** Message des réponses 429 (shape `{ error, success }` via `errorResponse`). */
export const RATE_LIMIT_MESSAGE = "Trop de tentatives. Réessayez plus tard.";

// ─── Store par défaut (Prisma / PostgreSQL) ──────────────────────────────────

/** Ligne brute attendue de `RETURNING "count"` — littéral, jamais `any`. */
type RawCountRow = { count: number };

/**
 * Narrowing strict du résultat brut de `$queryRaw` (type `unknown`) vers
 * `{ count: number }` : tableau non vide, première ligne objet portant une
 * propriété `count` de type number. Aucun cast, aucun `any`.
 */
function toCountRow(rows: unknown): RawCountRow {
    if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error("[rate-limit] résultat d'incrément illisible");
    }
    const first: unknown = rows[0];
    if (typeof first !== "object" || first === null || !("count" in first)) {
        throw new Error("[rate-limit] colonne count absente du résultat");
    }
    const count: unknown = first.count;
    if (typeof count !== "number") {
        throw new Error("[rate-limit] count non numérique");
    }
    return { count };
}

/**
 * Store par défaut : upsert atomique en UNE requête (pas de TOCTOU).
 * `import("./prisma")` est paresseux pour que les tests unitaires (store
 * injecté) ne chargent jamais le client Prisma.
 */
const prismaStore: RateLimitStore = {
    async increment(key: string, windowStart: Date): Promise<number> {
        const { prisma } = await import("./prisma");
        const rows: unknown = await prisma.$queryRaw`
            INSERT INTO rate_limit_buckets ("key", "windowStart", "count", "updatedAt")
            VALUES (${key}, ${windowStart}, 1, NOW())
            ON CONFLICT ("key") DO UPDATE SET
                "count" = CASE
                    WHEN rate_limit_buckets."windowStart" = EXCLUDED."windowStart"
                        THEN rate_limit_buckets."count" + 1
                    ELSE 1
                END,
                "updatedAt" = NOW()
            RETURNING "count"
        `;
        return toCountRow(rows).count;
    },
    async clear(key: string): Promise<void> {
        const { prisma } = await import("./prisma");
        await prisma.$executeRaw`DELETE FROM rate_limit_buckets WHERE "key" = ${key}`;
    },
    async purgeOlderThan(cutoff: Date): Promise<void> {
        const { prisma } = await import("./prisma");
        await prisma.$executeRaw`DELETE FROM rate_limit_buckets WHERE "windowStart" < ${cutoff}`;
    },
};

// ─── Purge opportuniste ──────────────────────────────────────────────────────

const PURGE_INTERVAL_MS = 5 * MINUTE; // au plus 1 purge toutes les 5 minutes
const PURGE_MAX_AGE_MS = 24 * HOUR; // buckets de plus de 24 h
let lastPurgeAt = 0; // compteur en mémoire de module (best-effort)

function maybePurge(store: RateLimitStore, now: number): void {
    if (now - lastPurgeAt < PURGE_INTERVAL_MS) return;
    lastPurgeAt = now;
    void store
        .purgeOlderThan(new Date(now - PURGE_MAX_AGE_MS))
        .catch((error: unknown) => {
            console.warn(
                "[rate-limit] purge opportuniste échouée:",
                error instanceof Error ? error.message : "erreur inconnue"
            );
        });
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Consomme une tentative pour `key`. Fenêtre fixe : le début de fenêtre est
 * aligné sur un multiple de `windowMs` (epoch), la fenêtre ne bouge donc pas
 * pendant que la requête aboutit. Fail-open : toute erreur du store autorise
 * la requête.
 */
export async function consumeRateLimit(
    key: string,
    opts: RateLimitOptions,
    store: RateLimitStore = prismaStore
): Promise<RateLimitDecision> {
    const now = Date.now();
    maybePurge(store, now);
    try {
        const windowStart = new Date(Math.floor(now / opts.windowMs) * opts.windowMs);
        const count = await store.increment(key, windowStart);
        const resetAt = new Date(windowStart.getTime() + opts.windowMs);
        if (count > opts.limit) {
            const retryAfterSeconds = Math.max(
                1,
                Math.ceil((resetAt.getTime() - now) / 1000)
            );
            return { ok: false, retryAfterSeconds };
        }
        return { ok: true, remaining: Math.max(0, opts.limit - count), resetAt };
    } catch (error) {
        console.warn(
            "[rate-limit] store indisponible, requête autorisée (fail-open):",
            error instanceof Error ? error.message : "erreur inconnue"
        );
        return {
            ok: true,
            remaining: opts.limit,
            resetAt: new Date(now + opts.windowMs),
        };
    }
}

/** Remet un compteur à zéro (ex. login réussi). Fail-open. */
export async function clearRateLimit(
    key: string,
    store: RateLimitStore = prismaStore
): Promise<void> {
    try {
        await store.clear(key);
    } catch (error) {
        console.warn(
            "[rate-limit] clear impossible (fail-open):",
            error instanceof Error ? error.message : "erreur inconnue"
        );
    }
}

/**
 * Extrait l'IP depuis des Headers : 1er saut de `x-forwarded-for`, sinon
 * `x-real-ip`, sinon `"unknown"`. Variante testable de `clientIp`.
 *
 * **Hypothèse de topologie** — le 1er saut est choisi parce que, sur Vercel,
 * l'edge **écrase** `x-forwarded-for` (anti-spoofing — doc officielle
 * `vercel.com/docs/headers/request-headers`) : topologie à **1 saut**, le 1er
 * = le dernier = IP réelle, donc le 1er saut est le bon sur ce déploiement.
 * À revoir dans deux cas :
 * - **CDN/proxy devant Vercel** (Cloudflare…) : Vercel voit l'IP du proxy →
 *   toutes les IP dans un même bucket → lockout collectif du login (dégradation
 *   pire qu'un bypass) ; il faudrait alors un header dédié du provider
 *   (`CF-Connecting-IP`) + « Verified Proxy » ;
 * - **hors Vercel** (dev/self-host) : le XFF est piloté par le client → le 1er
 *   saut devient contournable (rotation d'IP factices) ; préférer le dernier saut.
 */
export function clientIpFromHeaders(headers: Headers): string {
    const forwarded = headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0];
        const trimmed = first?.trim();
        if (trimmed) return trimmed;
    }
    const real = headers.get("x-real-ip");
    if (real) {
        const trimmed = real.trim();
        if (trimmed) return trimmed;
    }
    return "unknown";
}

/** IP du client d'une requête (voir `clientIpFromHeaders`). */
export function clientIp(request: NextRequest): string {
    return clientIpFromHeaders(request.headers);
}

/**
 * Longueur maximale d'une adresse email selon la RFC 5321 (limites `Path` /
 * mailbox) — borne appliquée à l'identifiant de `rateLimitKey()`.
 */
const MAX_IDENTIFIER_LENGTH = 254;

/**
 * Bornage strict de la clé finale (PK `TEXT` de `rate_limit_buckets`) :
 * marge large au-delà d'un préfixe `scope:dimension:` + identifiant borné à
 * 254, pour garantir une PK de taille contrôlée quelle que soit la longueur
 * des segments de scope/dimension.
 */
const MAX_KEY_LENGTH = 500;

/**
 * Construit la clé `${scope}:${dimension}:${identifier}`.
 *
 * Normalisation **déterministe** (deux identifiants équivalents doivent
 * produire la même clé, sinon le compteur ne compterait plus rien) :
 * 1. `trim()` + `toLowerCase()` — email casse-insensitive, IPv6 insensible à
 *    la casse, IPv4 inchangé ;
 * 2. troncature de l'identifiant à **254 caractères** : 254 = longueur maximale
 *    d'un email (RFC 5321) ; l'identifiant provient d'un corps de requête non
 *    validé (peut faire plusieurs Mo) alors que la clé est la PK `TEXT` de la
 *    table `rate_limit_buckets` ;
 * 3. troncature de la clé finale à **500 caractères** — borne la PK.
 *
 * NOTE PII : l'email reste stocké **en clair** dans la clé (nécessité d'un
 * lookup direct). Noté dans `docs/wiki/auth.md` (§ Rate limiting) ;
 * alternative ultérieure : SHA-256 de l'identifiant dans la clé.
 */
export function rateLimitKey(
    scope: string,
    dimension: RateLimitDimension,
    identifier: string
): string {
    const normalized = identifier.trim().toLowerCase().slice(0, MAX_IDENTIFIER_LENGTH);
    return `${scope}:${dimension}:${normalized}`.slice(0, MAX_KEY_LENGTH);
}

/** Réponse 429 standard : header `Retry-After` + shape `{ error, success:false }`. */
export function rateLimitResponse(decision: RateLimitBlocked): NextResponse {
    return NextResponse.json(errorResponse(RATE_LIMIT_MESSAGE), {
        status: 429,
        headers: { "Retry-After": String(decision.retryAfterSeconds) },
    });
}
