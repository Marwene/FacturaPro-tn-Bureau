import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import {
    SESSION_COOKIE_NAME,
    SECURE_SESSION_COOKIE_NAME,
} from "@/lib/session-token";
import {
    SECURE_SESSION_MARKER_COOKIE_NAME,
    SESSION_MARKER_COOKIE_NAME,
} from "@/lib/session-marker";
import { invalidateUserSessionCache } from "@/lib/session-cache";

/**
 * POST /api/auth/logout — destruction **côté serveur** de la session.
 *
 * ## Pourquoi une route applicative et pas `signOut()` de `next-auth/react`
 *
 * `signOut()` client POSTe vers `/api/auth/signout`, endpoint géré par Auth.js,
 * qui ne supprime que **ses propres cookies** (`authjs.session-token` /
 * `__Secure-authjs.session-token`). Le `__session-marker` est un cookie
 * **applicatif** — il ne figure dans aucune liste de cookies d'Auth.js — donc
 * il **survitait à la déconnexion** : session « incomplète » résiduelle, jetable
 * par un tiers ayant accès au même cookie jar. Cette route est la seule à
 * détruire les **quatre** cookies d'authentification, avec des attributs
 * identiques à ceux de leur écriture.
 *
 * ## Portée réelle de l'invalidation (limite structurelle assumée)
 *
 * Les sessions sont des **JWT sans état** (aucune table de sessions en base,
 * contrainte « pas de migration » respectée) : un jeton déjà exfiltré reste
 * cryptographiquement valide jusqu'à son `exp` (7 jours max). La destruction
 * serveur porte donc sur ce qui est destructible sans magasin de révocation :
 *   1. les 4 cookies (jeton d'auth + marqueur, noms nus et `__Secure-`) ;
 *   2. le cache mémoire de session de l'utilisateur
 *      (`invalidateUserSessionCache`) — purge immédiate du snapshot
 *      `actif/role/permissions` de cette instance.
 * Une révocation avant `exp` imposerait un magasin de révocation : signalé au
 * Governor comme suite d'architecture, hors périmètre de ce correctif.
 *
 * ## Contrat
 * `{ success: true, redirectTo: "/login" }` — inchangé côté client.
 * `requireCompany: false` : la déconnexion n'a aucune raison de résoudre une
 * société (ni d'en exiger une — logout d'un compte non configuré).
 */
// justifié : destruction de la session de l'utilisateur AUTHENTIFIÉ — aucune
// PermissionKey ne gouverne les sessions (rôle/permission non applicable ici).
export const POST = apiRoute.post(
    { authOnly: true, requireCompany: false },
    async (request, { session }) => {
        // Purge du cache mémoire de session de l'instance (actif/role/permissions)
        invalidateUserSessionCache(session.id);

        const response = NextResponse.json({
            success: true,
            redirectTo: "/login",
        });

        // Attributs strictement identiques à ceux de l'écriture : `__Secure-`
        // n'est posé qu'en HTTPS (`secure: true`), le nom nu qu'en HTTP local.
        const cookies: { name: string; secure: boolean }[] = [
            { name: SESSION_COOKIE_NAME, secure: false },
            { name: SECURE_SESSION_COOKIE_NAME, secure: true },
            { name: SESSION_MARKER_COOKIE_NAME, secure: false },
            { name: SECURE_SESSION_MARKER_COOKIE_NAME, secure: true },
        ];

        for (const { name, secure } of cookies) {
            response.cookies.set(name, "", {
                path: "/",
                maxAge: 0,
                httpOnly: true,
                sameSite: "lax",
                secure,
            });
        }

        return response;
    }
);
