import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import {
    decodeSessionToken,
    readSessionTokenFromRequest,
    SECURE_SESSION_COOKIE_NAME,
    SESSION_COOKIE_NAME,
} from "@/lib/session-token";
import {
    markerSatisfied,
    SECURE_SESSION_MARKER_COOKIE_NAME,
    SESSION_MARKER_COOKIE_NAME,
} from "@/lib/session-marker";
import { safeInternalPath, DEFAULT_POST_LOGIN_ROUTE } from "@/lib/safe-internal-path";

const publicPaths = ["/login", "/register", "/verify-email", "/api/auth"];
/** Paths publics à dé-dupliquer : déjà authentifié → redirection de retour (C2, item 4). */
const authRedirectingPublicPaths = ["/login", "/register"];

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
}

/**
 * Jeton d'auth décodé + marqueur conforme, ou null (absent/corrompu/marqueur
 * invalide). Utilisé pour la redirection « déjà authentifié » des paths publics.
 */
async function decodeAuthedToken(request: NextRequest): Promise<JWT | null> {
    const source = readSessionTokenFromRequest(request);
    if (!source) return null;
    const token = await decodeSessionToken(source);
    if (!token) return null;
    if (!(await markerSatisfied(request.cookies, source, token))) return null;
    return token;
}

// NOTE C2 : le wrapper next-auth mort (l'export implicite `auth(...)` des
// anciennes L12-18) a été supprimé — un seul export `proxy()`, aucun chemin ambigu.

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (publicPaths.some((p) => pathname.startsWith(p))) {
        // C2 item 4 — déjà authentifié sur /login ou /register : redirection de
        // retour vers le callbackUrl demandé (interne uniquement) ou le repli
        // unique `DEFAULT_POST_LOGIN_ROUTE` (`/`).
        if (
            authRedirectingPublicPaths.some(
                (p) => pathname === p || pathname.startsWith(`${p}/`)
            )
        ) {
            const token = await decodeAuthedToken(request);
            if (token) {
                const target =
                    safeInternalPath(request.nextUrl.searchParams.get("callbackUrl")) ??
                    DEFAULT_POST_LOGIN_ROUTE;
                return NextResponse.redirect(new URL(target, request.nextUrl.origin));
            }
        }
        return NextResponse.next();
    }

    // Allow static files and Next.js internals
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // Check for session token cookie (S-1 : le salt JWT est dérivé du nom du
    // cookie réellement lu — voir lib/session-token.ts, source unique).
    const source = readSessionTokenFromRequest(request);

    if (!source) {
        return redirectToLogin(request, pathname);
    }

    // Decode JWT (salt = nom du cookie lu) pour contrôler le flag rememberMe
    // et rejeter un token corrompu / mauvais salt.
    const token = await decodeSessionToken(source);

    if (!token) {
        return redirectToLogin(request, pathname);
    }

    // If rememberMe is false, check for the signed session-marker cookie.
    // The session-marker is a session cookie (no Max-Age / Expires)
    // so the browser deletes it on close → user must re-login.
    if (!(await markerSatisfied(request.cookies, source, token))) {
        // C2 item 3 — jamais de `cookies.delete` silencieux : le motif est
        // journalisé AVANT toute suppression (next.config.ts conserve
        // `error`/`warn` via `removeConsole` en production). Aucun secret ni
        // valeur de cookie dans le log.
        console.warn(
            `[proxy] session-marker absent ou invalide (rememberMe=false) sur ${pathname} — suppression des cookies d'auth`
        );
        const response = redirectToLogin(request, pathname);
        response.cookies.delete(SESSION_COOKIE_NAME);
        response.cookies.delete(SECURE_SESSION_COOKIE_NAME);
        response.cookies.delete(SESSION_MARKER_COOKIE_NAME);
        response.cookies.delete(SECURE_SESSION_MARKER_COOKIE_NAME);
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
