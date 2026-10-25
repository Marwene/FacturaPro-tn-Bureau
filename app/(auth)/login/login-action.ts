"use server";

import { cookies, headers } from "next/headers";
import { CredentialsSignin } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import {
    isAuthErrorCode,
    RateLimitedSignInError,
    type AuthErrorCode,
} from "@/lib/auth-errors";
import { createSessionMarker, sessionMarkerCookieName } from "@/lib/session-marker";
import { decodeSessionToken, readSessionToken } from "@/lib/session-token";
import { safeInternalPath, DEFAULT_POST_LOGIN_ROUTE } from "@/lib/safe-internal-path";
import type { LoginCredentials } from "@/hooks/use-login";

/**
 * C2 — Server Action de login (arbitrage C1 Option 1).
 *
 * Appelle `signIn("credentials", { redirect: false })` **côté serveur** puis,
 * dans la **même réponse** (le cookie jar de l'action), pose `__session-marker`
 * en **httpOnly**, **signé** et **lié aux claims stables du jeton d'auth
 * décodé** (`lib/session-marker.ts`). Fini l'aller-retour client où le marqueur
 * n'existait pas encore au premier passage de `proxy.ts` (bug racine :
 * « retour au login » après identifiants valides).
 *
 * `signIn` serveur (next-auth v5 beta) écrit le cookie d'auth via `cookies()`
 * de `next/headers` : `cookies().get()` revoit immédiatement la valeur posée,
 * qu'on décode ici (`decodeSessionToken`) pour en extraire l'id utilisateur et
 * le flag `rememberMe` — les claims auxquels le `bind` du marqueur est lié.
 */

// Validation de l'entrée — la Server Action est exposée au client, aucune
// confiance dans les types d'appelant (REUSE : Zod, déjà en dépendance).
const loginInputSchema = z.object({
    email: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(512),
    rememberMe: z.boolean(),
});

export type LoginActionResult =
    | { ok: true; redirectTo: string }
    | {
          ok: false;
          code: AuthErrorCode;
          message: string;
          retryAfterSeconds?: number;
      };

/** Messages affichables côté client — aucun secret, aucun détail d'infrastructure. */
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
    invalid_credentials: "Email ou mot de passe incorrect.",
    deactivated: "Ce compte a été désactivé. Contactez l'administrateur.",
    unverified: "Veuillez vérifier votre e-mail avant de vous connecter.",
    rate_limited: "Trop de tentatives. Réessayez plus tard.",
};

/** HTTPS ? (proto proxy-inverse, sinon origine) — pilote le préfixe `__Secure-` du marqueur. */
async function requestIsSecure(): Promise<boolean> {
    const headerStore = await headers();
    const forwardedProto = headerStore.get("x-forwarded-proto");
    if (forwardedProto) {
        return forwardedProto.split(",")[0]?.trim() === "https";
    }
    return headerStore.get("origin")?.startsWith("https://") === true;
}

/**
 * Pose le marqueur signé dans le cookie jar de la réponse d'action.
 * Session cookie : aucune `maxAge`/`expires` → supprimé à la fermeture du
 * navigateur (rememberMe=false). httpOnly + SameSite=Lax comme le cookie d'auth.
 */
async function writeSessionMarker(): Promise<void> {
    const jar = await cookies();
    const source = readSessionToken(jar);
    if (!source) {
        // Ne jamais échouer une connexion pourtant réussie : le prochain passage
        // de proxy.ts rejettera proprement (log + re-login).
        console.error(
            "[login-action] cookie de session absent après signIn réussi — __session-marker non posé"
        );
        return;
    }

    // Le `bind` du marqueur porte les claims STABLES du jeton décodé (id +
    // rememberMe) — jamais la valeur exacte du cookie, que Auth.js re-signe à
    // chaque lecture de session. Un décodage impossible ici ne devrait jamais
    // arriver juste après un `signIn` réussi : on n'échoue JAMAIS la connexion
    // pour autant (même garde-fou que ci-dessus → re-login au prochain passage
    // de proxy.ts, qui rejette proprement).
    const token = await decodeSessionToken(source);
    if (!token) {
        console.error(
            "[login-action] cookie de session non décodable après signIn réussi — __session-marker non posé"
        );
        return;
    }

    const secure = await requestIsSecure();
    const marker = await createSessionMarker(token);
    jar.set(sessionMarkerCookieName(secure), marker, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure,
    });
}

/** Traduit l'`AuthError` re-lancée par `signIn` en résultat structuré. */
function signInErrorResult(error: CredentialsSignin): LoginActionResult {
    const code: AuthErrorCode = isAuthErrorCode(error.code)
        ? error.code
        : "invalid_credentials";

    if (error instanceof RateLimitedSignInError) {
        return {
            ok: false,
            code,
            message: `Trop de tentatives. Réessayez dans ${error.retryAfterSeconds} secondes.`,
            retryAfterSeconds: error.retryAfterSeconds,
        };
    }

    return { ok: false, code, message: ERROR_MESSAGES[code] };
}

/**
 * Connexion par identifiants. À côté de `signIn("credentials")` client
 * (`hooks/use-login.ts`, migré en C3) : la Server Action est la voie canonique
 * (marqueur posé dans la même réponse que le cookie d'auth).
 */
export async function loginAction(
    input: LoginCredentials,
    callbackUrl?: string
): Promise<LoginActionResult> {
    const parsed = loginInputSchema.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            code: "invalid_credentials",
            message: ERROR_MESSAGES.invalid_credentials,
        };
    }

    const { email, password, rememberMe } = parsed.data;
    // Repli unique (`DEFAULT_POST_LOGIN_ROUTE` = `/`) : `/dashboard` n'existe
    // pas → 404 post-login. Voir lib/safe-internal-path.ts.
    const redirectTo = safeInternalPath(callbackUrl) ?? DEFAULT_POST_LOGIN_ROUTE;

    try {
        await signIn("credentials", {
            email,
            password,
            rememberMe: rememberMe ? "true" : "false",
            redirect: false,
            redirectTo,
        });
    } catch (error: unknown) {
        // next-auth re-lance les AuthError de `authorize` dans une Server Action
        // (raw + pas de X-Auth-Return-Redirect). Toute autre erreur est une
        // erreur d'infrastructure : rethrow (digest serveur, aucun détail fuité).
        if (error instanceof CredentialsSignin) {
            return signInErrorResult(error);
        }
        throw error;
    }

    await writeSessionMarker();
    return { ok: true, redirectTo };
}
