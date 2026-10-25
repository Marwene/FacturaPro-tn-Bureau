import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import {
    decodeSessionToken,
    encodeSessionToken,
    SESSION_COOKIE_NAME,
    SECURE_SESSION_COOKIE_NAME,
} from "@/lib/session-token";
import {
    createSessionMarker,
    SESSION_MARKER_COOKIE_NAME,
} from "@/lib/session-marker";

/**
 * C4 — Tests de la logique de décision de `proxy.ts` (lot C2) sur la fonction
 * `proxy()` réelle (pas une re-implémentation) : couvre le contrat du
 * session-marker signé pour `rememberMe === false`, la redirection « déjà
 * authentifié » des paths publics et la capture de `callbackUrl`.
 */

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

const TEST_SECRET = "secret-de-test-proxy-authz-1";

beforeAll(() => {
    process.env.AUTH_SECRET = TEST_SECRET;
});

afterAll(() => {
    process.env.AUTH_SECRET = ORIGINAL_SECRET;
});

interface TokenOverrides {
    id?: string;
    rememberMe?: boolean;
    lastActivity?: number;
}

async function sessionTokenCookie(overrides: TokenOverrides = {}): Promise<string> {
    return encodeSessionToken(
        {
            id: overrides.id ?? "user-1",
            role: "ADMIN",
            companyId: "company-1",
            permissions: [],
            allowedCompanyIds: ["company-1"],
            emailVerified: null,
            rememberMe: overrides.rememberMe ?? false,
            lastActivity: overrides.lastActivity ?? Date.now(),
        },
        SESSION_COOKIE_NAME
    );
}

/**
 * Jeton de session **décodé** (même pipeline que `proxy.ts`) — forme attendue
 * par `createSessionMarker` (le `bind` du marqueur porte les claims stables du
 * jeton décodé, pas la valeur brute du cookie qu'Auth.js re-signerait).
 */
async function decodedSessionToken(overrides: TokenOverrides = {}) {
    const token = await decodeSessionToken({
        token: await sessionTokenCookie(overrides),
        cookieName: SESSION_COOKIE_NAME,
    });
    if (token === null) throw new Error("token de test non décodable");
    return token;
}

function makeRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
    const cookieHeader = Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    return new NextRequest(`http://localhost:3000${path}`, {
        headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
}

/** NextResponse.next() porte l'en-tête `x-middleware-next: 1`. */
function isPassThrough(response: Response): boolean {
    return response.headers.get("x-middleware-next") === "1";
}

function locationOf(response: Response): string | null {
    return response.headers.get("location");
}

describe("proxy() — garde de session (paths protégés)", () => {
    it("redirige vers /login (avec callbackUrl interne) sans cookie de session", async () => {
        const response = await proxy(makeRequest("/factures"));

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toBe(
            "http://localhost:3000/login?callbackUrl=%2Ffactures"
        );
    });

    it("laisse passer rememberMe=true SANS marqueur (aucun marqueur requis)", async () => {
        const token = await sessionTokenCookie({ rememberMe: true });

        const response = await proxy(
            makeRequest("/factures", { [SESSION_COOKIE_NAME]: token })
        );

        expect(isPassThrough(response)).toBe(true);
    });

    it("laisse passer rememberMe=false AVEC un marqueur signé lié aux claims stables du jeton", async () => {
        const token = await sessionTokenCookie({ rememberMe: false });
        const marker = await createSessionMarker(await decodedSessionToken({ rememberMe: false }));

        const response = await proxy(
            makeRequest("/factures", {
                [SESSION_COOKIE_NAME]: token,
                [SESSION_MARKER_COOKIE_NAME]: marker,
            })
        );

        expect(isPassThrough(response)).toBe(true);
    });

    it("laisse passer rememberMe=false si le JWT a été RE-SIGNÉ entre le login et la requête (rotation Auth.js, claims stables identiques)", async () => {
        // Le jalon `useSession().update()` réécrit `lastActivity` → Auth.js
        // re-signe le JWT : la valeur brute du cookie diffère de celle du
        // login, mais le marqueur est lié aux claims stables (id + rememberMe).
        const tokenV1 = await sessionTokenCookie({
            rememberMe: false,
            lastActivity: 1_700_000_000_000,
        });
        const tokenV2 = await sessionTokenCookie({
            rememberMe: false,
            lastActivity: 1_700_000_300_000,
        });
        expect(tokenV2).not.toBe(tokenV1);
        const marker = await createSessionMarker(
            await decodedSessionToken({ rememberMe: false, lastActivity: 1_700_000_000_000 })
        );

        const response = await proxy(
            makeRequest("/factures", {
                [SESSION_COOKIE_NAME]: tokenV2,
                [SESSION_MARKER_COOKIE_NAME]: marker,
            })
        );

        expect(isPassThrough(response)).toBe(true);
    });

    it("rejette rememberMe=false SANS marqueur (redirige + supprime les cookies d'auth)", async () => {
        const token = await sessionTokenCookie({ rememberMe: false });

        const response = await proxy(
            makeRequest("/factures", { [SESSION_COOKIE_NAME]: token })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toContain("/login");

        const setCookies = response.headers.getSetCookie();
        const deletedNames = setCookies
            .filter((entry) => entry.includes("Expires=Thu, 01 Jan 1970"))
            .map((entry) => entry.split("=")[0]?.trim());
        expect(deletedNames).toContain(SESSION_COOKIE_NAME);
        expect(deletedNames).toContain(SECURE_SESSION_COOKIE_NAME);
        expect(deletedNames).toContain(SESSION_MARKER_COOKIE_NAME);
    });

    it("rejette rememberMe=false avec l'ancien marqueur client non signé « 1 » (legacy)", async () => {
        const token = await sessionTokenCookie({ rememberMe: false });

        const response = await proxy(
            makeRequest("/factures", {
                [SESSION_COOKIE_NAME]: token,
                [SESSION_MARKER_COOKIE_NAME]: "1",
            })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toContain("/login");
    });

    it("rejette un marqueur signé mais lié à un AUTRE utilisateur (non réutilisable)", async () => {
        const token = await sessionTokenCookie({ rememberMe: false });
        const foreignMarker = await createSessionMarker(
            await decodedSessionToken({ id: "user-2", rememberMe: false })
        );

        const response = await proxy(
            makeRequest("/factures", {
                [SESSION_COOKIE_NAME]: token,
                [SESSION_MARKER_COOKIE_NAME]: foreignMarker,
            })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toContain("/login");
    });

    it("rejette un marqueur du MÊME utilisateur mais émis pour un autre flag rememberMe", async () => {
        const token = await sessionTokenCookie({ rememberMe: false });
        // Même id, autre valeur de flag → autre empreinte de claims stables.
        const foreignMarker = await createSessionMarker(
            await decodedSessionToken({ id: "user-1", rememberMe: true })
        );

        const response = await proxy(
            makeRequest("/factures", {
                [SESSION_COOKIE_NAME]: token,
                [SESSION_MARKER_COOKIE_NAME]: foreignMarker,
            })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toContain("/login");
    });

    it("rejette un jeton de session corrompu (redirige vers /login)", async () => {
        const response = await proxy(
            makeRequest("/factures", { [SESSION_COOKIE_NAME]: "jeton-corrompu" })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toContain("/login");
    });

    it("laisse passer les paths publics et les assets sans session", async () => {
        expect(isPassThrough(await proxy(makeRequest("/verify-email")))).toBe(true);
        expect(isPassThrough(await proxy(makeRequest("/api/auth/session")))).toBe(true);
        expect(isPassThrough(await proxy(makeRequest("/_next/static/app.js")))).toBe(true);
    });
});

describe("proxy() — redirection « déjà authentifié » sur /login et /register", () => {
    it("redirige un utilisateur déjà authentifié vers son callbackUrl INTERNE", async () => {
        const token = await sessionTokenCookie({ rememberMe: true });

        const response = await proxy(
            makeRequest("/login?callbackUrl=/parametres/profil", {
                [SESSION_COOKIE_NAME]: token,
            })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toBe("http://localhost:3000/parametres/profil");
    });

    it("piège un callbackUrl protocol-relatif `//evil.com` → repli `/` (pas d'open-redirect)", async () => {
        const token = await sessionTokenCookie({ rememberMe: true });

        const response = await proxy(
            makeRequest(`/login?callbackUrl=${encodeURIComponent("//evil.com")}`, {
                [SESSION_COOKIE_NAME]: token,
            })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toBe("http://localhost:3000/");
    });

    it("piège le vecteur de contournement par BACKSLASH `/\evil.com` → repli `/` (pas d'open-redirect)", async () => {
        // Correctif QA : l'ancien test de chaîne `startsWith("//")` laissait
        // passer `/\evil.com` — le parseur WHATWG le normalise ensuite en
        // `https://evil.com/` (phishing post-login). La comparaison d'origine
        // (`lib/safe-internal-path.ts`) doit le refuser → repli
        // `DEFAULT_POST_LOGIN_ROUTE` (`/`).
        const token = await sessionTokenCookie({ rememberMe: true });

        const response = await proxy(
            makeRequest(`/login?callbackUrl=${encodeURIComponent("/\\evil.com")}`, {
                [SESSION_COOKIE_NAME]: token,
            })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toBe("http://localhost:3000/");
    });

    it("piège le vecteur de contournement par TABULATION U+0009 `/\t/evil.com` → repli `/` (pas d'open-redirect)", async () => {
        // Correctif QA : la tabulation est supprimée par le parseur avant
        // normalisation → `//evil.com` résolu en `https://evil.com/` sous
        // l'ancien filtre. Même repli `DEFAULT_POST_LOGIN_ROUTE` (`/`) exigé.
        const token = await sessionTokenCookie({ rememberMe: true });

        const response = await proxy(
            makeRequest(`/login?callbackUrl=${encodeURIComponent("/\t/evil.com")}`, {
                [SESSION_COOKIE_NAME]: token,
            })
        );

        expect(isPassThrough(response)).toBe(false);
        expect(locationOf(response)).toBe("http://localhost:3000/");
    });

    it("piège un callbackUrl absolu externe `https://evil.com` → repli `/`", async () => {
        const token = await sessionTokenCookie({ rememberMe: true });

        const response = await proxy(
            makeRequest(`/login?callbackUrl=${encodeURIComponent("https://evil.com/x")}`, {
                [SESSION_COOKIE_NAME]: token,
            })
        );

        expect(locationOf(response)).toBe("http://localhost:3000/");
    });

    it("défaut DEFAULT_POST_LOGIN_ROUTE (`/`) sans callbackUrl", async () => {
        const token = await sessionTokenCookie({ rememberMe: true });

        const response = await proxy(
            makeRequest("/login", { [SESSION_COOKIE_NAME]: token })
        );

        expect(locationOf(response)).toBe("http://localhost:3000/");
    });

    it("applique la même redirection sur /register", async () => {
        const token = await sessionTokenCookie({ rememberMe: true });

        const response = await proxy(
            makeRequest("/register", { [SESSION_COOKIE_NAME]: token })
        );

        expect(locationOf(response)).toBe("http://localhost:3000/");
    });

    it("NE redirige PAS un visiteur de /login dont le jeton est présent mais le marqueur absent (rememberMe=false) — pas de boucle", async () => {
        const token = await sessionTokenCookie({ rememberMe: false });

        const response = await proxy(
            makeRequest("/login", { [SESSION_COOKIE_NAME]: token })
        );

        expect(isPassThrough(response)).toBe(true);
    });

    it("laisse un visiteur non authentifié atteindre /login", async () => {
        const response = await proxy(makeRequest("/login"));

        expect(isPassThrough(response)).toBe(true);
    });
});
