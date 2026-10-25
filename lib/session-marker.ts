import { SignJWT, base64url, jwtVerify } from "jose";
import type { JWT } from "next-auth/jwt";
import {
    authSecret,
    type CookieReader,
    type SessionTokenSource,
} from "./session-token";

/**
 * C2 — `__session-marker` signé et lié au jeton de session (lot C1, Option 1).
 *
 * Historiquement, le marqueur était écrit côté client (`document.cookie` via
 * `SessionMarker`), non-httpOnly et non signé (valeur `"1"`), donc :
 *   1. absent du tout premier aller-retour serveur après login → `proxy.ts`
 *      supprimait les cookies d'auth → « retour au login » après identifiants
 *      valides (bug racine C1) ;
 *   2. falsifiable à volonté par du JS tiers (contournement du re-login à la
 *      fermeture du navigateur).
 *
 * Désormais, la marqueur est posé par la Server Action de login
 * (`app/(auth)/login/login-action.ts`) en **httpOnly**, **signé (JWS HS256 via
 * `jose`, déjà présent via next-auth)** et **lié aux claims STABLES du jeton
 * décodé** : le payload porte
 * `bind = base64url(SHA-256(id utilisateur ‖ flag rememberMe))`. Le marqueur
 * est donc valide pour la session de l'utilisateur concerné, et **résilient à
 * la rotation automatique du JWT par Auth.js** : `@auth/core` **re-signe (et
 * donc re-génère) le JWT à chaque lecture de session** (`@auth/core/lib/actions/session.js`
 * — « Refresh JWT expiry by re-signing it ») et notre callback `jwt` y écrit
 * `token.lastActivity = Date.now()` (`lib/auth.ts`) → la **valeur exacte** du
 * cookie change en cours de session, dès le premier jalon
 * `useSession().update()`. Un marqueur lié à cette valeur exacte devenait
 * invalide dès ce jalon → `proxy.ts` supprimait les cookies d'auth et
 * rebondissait sur `/login` en boucle (reconnexion impossible jusqu'à la mort
 * des cookies). La rotation du JWS étant inévitable, le lien porte sur
 * l'identité (id + flag `rememberMe`) et non sur l'empreinte du jeton.
 * `proxy.ts` vérifie signature + lien ; un jeton invalide/expiré ou un
 * marqueur absent = même comportement (refus).
 *
 * **Rupture de compatibilité assumée (pas de chemin legacy)** : les marqueurs
 * signés sous l'ancienne empreinte (`SHA-256(valeur exacte du jeton)`) sont
 * rejetés → un seul re-login par utilisateur connecté en `rememberMe=false`
 * lors du déploiement de ce correctif.
 *
 * Semantique « session cookie » : ni `Max-Age` ni `Expires` → le navigateur le
 * supprime à la fermeture → l'utilisateur doit se reconnecter (rememberMe=false).
 *
 * Noms de cookie : `__session-marker` en local (HTTP),
 * `__Secure-__session-marker` en production (HTTPS) — mêmes conventions que le
 * cookie d'auth (`authjs.session-token` / `__Secure-authjs.session-token`,
 * cf. `lib/session-token.ts`). La **lecture** accepte les deux noms, la
 * **criture** choisit selon le protocole de la requête.
 */

export const SESSION_MARKER_COOKIE_NAME = "__session-marker";
export const SECURE_SESSION_MARKER_COOKIE_NAME = "__Secure-__session-marker";

export type SessionMarkerCookieName =
    | typeof SESSION_MARKER_COOKIE_NAME
    | typeof SECURE_SESSION_MARKER_COOKIE_NAME;

/** Nom du cookie à écrire selon le protocole de la requête (HTTPS → préfixe `__Secure-`). */
export function sessionMarkerCookieName(secure: boolean): SessionMarkerCookieName {
    return secure ? SECURE_SESSION_MARKER_COOKIE_NAME : SESSION_MARKER_COOKIE_NAME;
}

/**
 * Lecture du marqueur — le cookie `__Secure-` (prod HTTPS) est prioritaire,
 * sinon le cookie nu (local), comme `readSessionToken`.
 */
export function readSessionMarker(cookies: CookieReader): string | null {
    const secure = cookies.get(SECURE_SESSION_MARKER_COOKIE_NAME);
    if (secure?.value) return secure.value;

    const plain = cookies.get(SESSION_MARKER_COOKIE_NAME);
    if (plain?.value) return plain.value;

    return null;
}

// ─── Signature ────────────────────────────────────────────────────────────────

const MARKER_ISSUER = "facturapro-session-marker";
const MARKER_ALGORITHM = "HS256";
/** Séparation de domaine : la clé HMAC du marqueur est distincte du secret Auth.js. */
const KEY_DERIVATION_LABEL = "facturapro:session-marker:v1:";

/**
 * Clé HMAC du marqueur : SHA-256(label de domaine ‖ AUTH_SECRET). Dérivation
 * standard (séparation de domaine), aucun schéma crypto inventé — primitives
 * Web Crypto (disponibles en Edge Runtime pour `proxy.ts` et en Node).
 */
async function markerKey(): Promise<CryptoKey> {
    const material = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(KEY_DERIVATION_LABEL + authSecret())
    );
    return crypto.subtle.importKey(
        "raw",
        material,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

/**
 * Forme canonique des claims stables liés au marqueur : `${id}|${rememberMe===false}`.
 * `id` est un identifiant appli (cuid/uuid, jamais `|`) et le flag est réduit à
 * un booléen littéral → sérialisation sans ambiguïté (ni séparateur ni
 * ambiguïté de typage exploitable).
 */
function canonicalBinding(token: JWT): string {
    // `rememberMe` n'est pas dans l'augmentation `types/next-auth.d.ts` :
    // comparaison explicite (narrowing naturel sur `unknown`) — `undefined`
    // (champ absent) suit la même règle que `markerSatisfied` (`!== false`).
    return `${typeof token.id === "string" ? token.id : ""}|${token.rememberMe === false}`;
}

/**
 * Empreinte des **claims stables** du jeton d'auth (`bind` du payload JWS).
 *
 * Pourquoi et non l'empreinte de la valeur exacte du cookie : Auth.js re-signe
 * (re-génère) le JWT à **chaque lecture de session** (`@auth/core` — « Refresh
 * JWT expiry by re-signing it ») et le callback `jwt` de `lib/auth.ts` y écrit
 * `lastActivity` → la valeur du jeton change en cours de session (jalon
 * `useSession().update()`, 30 % du temps de session). Un `bind` sur cette
 * valeur rendait invalide tout marqueur dès ce jalon → boucle de re-login.
 * Lier à l'id utilisateur + au flag `rememberMe` rend le marqueur stable sur
 * toute la vie de la session, sans affaiblir la séparation des utilisateurs
 * (le JWT reste signé par Auth.js avec `AUTH_SECRET`, dont dérive la clé HMAC
 * du marqueur).
 */
async function tokenBinding(token: JWT): Promise<string> {
    const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonicalBinding(token))
    );
    return base64url.encode(new Uint8Array(digest));
}

/**
 * Crée le marqueur signé pour le jeton d'auth **décodé** (JWS compact HS256,
 * sans `exp` : la durée de vie est portée par le session cookie lui-même).
 * Le `bind` du payload porte l'empreinte des claims stables (id + rememberMe),
 * pas celle de la valeur du jeton — voir `tokenBinding`.
 */
export async function createSessionMarker(token: JWT): Promise<string> {
    const bind = await tokenBinding(token);
    return new SignJWT({ bind })
        .setProtectedHeader({ alg: MARKER_ALGORITHM })
        .setIssuer(MARKER_ISSUER)
        .sign(await markerKey());
}

/**
 * Vérifie le marqueur : signature valide (vérification constante en temps par
 * `jose`/WebCrypto) ET lien avec les **claims stables** du jeton d'auth
 * décodé (claim `bind`). Résilient à la rotation du JWS par Auth.js, strict
 * sur l'identité (un marqueur d'un autre utilisateur est rejeté). Tout échec —
 * marqueur absent du schéma attendu, signature altérée, `exp` passé, ou lié à
 * un autre utilisateur — retourne `false`, comportement strictement équivalent
 * à un marqueur absent côté `proxy.ts`. Ne lève jamais.
 */
export async function verifySessionMarker(
    marker: string,
    token: JWT
): Promise<boolean> {
    try {
        const { payload } = await jwtVerify(marker, await markerKey(), {
            issuer: MARKER_ISSUER,
            algorithms: [MARKER_ALGORITHM],
        });
        if (typeof payload.bind !== "string") return false;
        return payload.bind === (await tokenBinding(token));
    } catch {
        return false;
    }
}

/**
 * C2 item 3 — **règle de conformité du marqueur, enfin partagée** : extraite de
 * `proxy.ts` (où elle était privée et non réutilisable) pour servir à la fois
 * la garde middleware (`proxy.ts`) et la page `/login`
 * (`app/(auth)/login/page.tsx`), qui doit savoir si une session existante est
 * « complète » avant de rediriger — sinon session rejouée/perdue sans son
 * marqueur → boucle de redirection.
 *
 * Règle : `rememberMe !== false` → toujours `true` (aucun marqueur exigé).
 * `rememberMe === false` → marqueur **signé et lié aux claims stables du jeton
 * réellement lu** (`readSessionMarker` + `verifySessionMarker(token)`), sinon
 * `false` (absent, altéré, expiré ou lié à un autre utilisateur).
 *
 * Typé sur un accesseur `CookieReader` (compatible `NextRequest.cookies` ET
 * `cookies()` de `next/headers`), le jeton brut `SessionTokenSource` (garde
 * défensif : sans valeur de cookie de session, rien ne peut satisfaire le
 * marqueur — sinon le décodage a échoué) et le `JWT` décodé (dont dépend le
 * `bind`) — jamais sur `NextRequest` en dur.
 */
export async function markerSatisfied(
    cookies: CookieReader,
    source: SessionTokenSource,
    token: JWT
): Promise<boolean> {
    if (source.token === "") return false;
    if (token.rememberMe !== false) return true;
    const marker = readSessionMarker(cookies);
    if (marker === null) return false;
    return verifySessionMarker(marker, token);
}
