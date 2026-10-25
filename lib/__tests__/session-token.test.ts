import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Prisma est instancié à l'import de lib/prisma.ts (DATABASE_URL requise) :
// le module est mocké entièrement (vi.mock est hoisté au-dessus des imports).
const { findUniqueMock } = vi.hoisted(() => ({
    findUniqueMock: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
    prisma: { user: { findUnique: findUniqueMock } },
}));

import { getSessionFromRequest } from "@/lib/session";
import {
    encodeSessionToken,
    readSessionTokenFromRequest,
    SESSION_COOKIE_NAME,
    SECURE_SESSION_COOKIE_NAME,
    type SessionCookieName,
} from "@/lib/session-token";
import {
    clearUserSessionCache,
    invalidateUserSessionCache,
    USER_SESSION_CACHE_TTL_MS,
} from "@/lib/session-cache";

process.env.AUTH_SECRET = "secret-de-test-b1";

interface TokenOverrides {
    id?: string;
    role?: string;
    companyId?: string;
    permissions?: string[];
    allowedCompanyIds?: string[];
    lastActivity?: number;
    rememberMe?: boolean;
}

async function buildToken(
    overrides: TokenOverrides = {},
    cookieName: SessionCookieName = SESSION_COOKIE_NAME
): Promise<string> {
    return encodeSessionToken(
        {
            emailVerified: null,
            id: overrides.id ?? "user-1",
            role: overrides.role ?? "ADMIN",
            companyId: overrides.companyId ?? "company-1",
            permissions: overrides.permissions ?? ["factures.create"],
            allowedCompanyIds: overrides.allowedCompanyIds ?? ["company-1"],
            lastActivity: overrides.lastActivity ?? Date.now(),
            rememberMe: overrides.rememberMe ?? true,
        },
        cookieName
    );
}

function requestWithCookieHeader(cookieHeader: string): Request {
    return new Request("http://localhost/api/test", {
        headers: { cookie: cookieHeader },
    });
}

function mockDbUser(
    overrides: { actif?: boolean; role?: string; permissions?: string[] } = {}
): void {
    findUniqueMock.mockResolvedValue({
        actif: overrides.actif ?? true,
        role: overrides.role ?? "ADMIN",
        permissions: overrides.permissions ?? ["factures.create"],
    });
}

beforeEach(() => {
    clearUserSessionCache();
    findUniqueMock.mockReset();
});

afterEach(() => {
    vi.useRealTimers();
});

describe("getSessionFromRequest", () => {
    it("retourne la session pour un token valide (cookie non sécurisé)", async () => {
        const token = await buildToken();
        mockDbUser();

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session).toEqual({
            id: "user-1",
            role: "ADMIN",
            companyId: "company-1",
            permissions: ["factures.create"],
            allowedCompanyIds: ["company-1"],
        });
        expect(findUniqueMock).toHaveBeenCalledTimes(1);
    });

    it("retourne null sans cookie de session", async () => {
        expect(await getSessionFromRequest(requestWithCookieHeader(""))).toBeNull();
        expect(findUniqueMock).not.toHaveBeenCalled();
    });

    it("retourne null pour un token corrompu", async () => {
        expect(
            await getSessionFromRequest(
                requestWithCookieHeader(`${SESSION_COOKIE_NAME}=jeton-invalide`)
            )
        ).toBeNull();
        expect(findUniqueMock).not.toHaveBeenCalled();
    });

    it("refuse un token expiré via lastActivity (sans rememberMe, > 30 min d'inactivité)", async () => {
        const token = await buildToken({
            rememberMe: false,
            lastActivity: Date.now() - (31 * 60 * 1000),
        });
        mockDbUser();

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session).toBeNull();
        expect(findUniqueMock).not.toHaveBeenCalled();
    });

    it("accepte un token rememberMe=true dont l'inactivité est inférieure à 7 jours", async () => {
        const token = await buildToken({
            rememberMe: true,
            lastActivity: Date.now() - (3 * 24 * 60 * 60 * 1000),
        });
        mockDbUser();

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session?.id).toBe("user-1");
    });

    it("refuse un utilisateur désactivé (actif=false)", async () => {
        const token = await buildToken();
        mockDbUser({ actif: false });

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session).toBeNull();
    });

    it("refuse un utilisateur supprimé de la base", async () => {
        const token = await buildToken();
        findUniqueMock.mockResolvedValue(null);

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session).toBeNull();
    });

    it("reflete les permissions/rôle modifiés après invalidation du cache", async () => {
        const token = await buildToken();
        const request = requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`);
        mockDbUser({ role: "ADMIN", permissions: ["factures.create"] });

        const first = await getSessionFromRequest(request);
        expect(first?.permissions).toEqual(["factures.create"]);
        expect(findUniqueMock).toHaveBeenCalledTimes(1);

        // Modification en base (ex: rétrogradation) — le cache frais masque encore le changement
        mockDbUser({ role: "USER", permissions: ["autre.permission"] });
        const cached = await getSessionFromRequest(request);
        expect(cached?.permissions).toEqual(["factures.create"]);
        expect(cached?.role).toEqual("ADMIN");
        expect(findUniqueMock).toHaveBeenCalledTimes(1);

        // Invalidation (point de mutation user) → changement immédiatement visible
        invalidateUserSessionCache("user-1");
        const refreshed = await getSessionFromRequest(request);
        expect(refreshed?.permissions).toEqual(["autre.permission"]);
        expect(refreshed?.role).toEqual("USER");
        expect(findUniqueMock).toHaveBeenCalledTimes(2);
    });

    it("perd l'accès d'un utilisateur désactivé après expiration du cache (30 s)", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));

        const token = await buildToken();
        const request = requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`);
        mockDbUser({ actif: true });

        expect(await getSessionFromRequest(request)).not.toBeNull();
        expect(await getSessionFromRequest(request)).not.toBeNull();
        expect(findUniqueMock).toHaveBeenCalledTimes(1); // servi par le cache

        // L'utilisateur est désactivé en base SANS invalidation : le TTL fait foi
        mockDbUser({ actif: false });
        vi.setSystemTime(Date.now() + USER_SESSION_CACHE_TTL_MS + 1_000);

        expect(await getSessionFromRequest(request)).toBeNull();
        expect(findUniqueMock).toHaveBeenCalledTimes(2);
    });

    it("conserve les valeurs du token si la base est indisponible (convention du callback jwt)", async () => {
        const token = await buildToken({ role: "USER", permissions: ["x"] });
        findUniqueMock.mockRejectedValue(new Error("db down"));

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session?.role).toBe("USER");
        expect(session?.permissions).toEqual(["x"]);
        expect(findUniqueMock).toHaveBeenCalledTimes(1); // rien n'est mis en cache sur erreur
    });

    it("décode avec le salt du cookie __Secure-authjs.session-token (production HTTPS)", async () => {
        const token = await buildToken({}, SECURE_SESSION_COOKIE_NAME);
        mockDbUser();

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SECURE_SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session?.id).toBe("user-1");
    });

    it("décode avec le salt du cookie non sécurisé authjs.session-token (local HTTP)", async () => {
        const token = await buildToken({}, SESSION_COOKIE_NAME);
        mockDbUser();

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session?.id).toBe("user-1");
    });

    it("refuse un token dont le salt de dérivation ne correspond pas au cookie lu", async () => {
        // Token encodé avec le salt "__Secure-…" mais présenté dans le cookie non sécurisé
        const token = await buildToken({}, SECURE_SESSION_COOKIE_NAME);
        mockDbUser();

        const session = await getSessionFromRequest(
            requestWithCookieHeader(`${SESSION_COOKIE_NAME}=${token}`)
        );

        expect(session).toBeNull();
        expect(findUniqueMock).not.toHaveBeenCalled();
    });
});

describe("readSessionTokenFromRequest", () => {
    it("utilise request.cookies quand présent (NextRequest)", () => {
        const request = {
            cookies: {
                get: (name: string) =>
                    name === SECURE_SESSION_COOKIE_NAME ? { value: "tok-secure" } : undefined,
            },
        } as unknown as Request;

        expect(readSessionTokenFromRequest(request)).toEqual({
            token: "tok-secure",
            cookieName: SECURE_SESSION_COOKIE_NAME,
        });
    });

    it("parse l'en-tête Cookie pour un Request nu et priorise le cookie __Secure-", () => {
        const request = requestWithCookieHeader(
            `${SESSION_COOKIE_NAME}=tok-plain; ${SECURE_SESSION_COOKIE_NAME}=tok-secure`
        );

        expect(readSessionTokenFromRequest(request)).toEqual({
            token: "tok-secure",
            cookieName: SECURE_SESSION_COOKIE_NAME,
        });
    });

    it("retombe sur le cookie non sécurisé quand le cookie __Secure- est absent", () => {
        const request = requestWithCookieHeader(`${SESSION_COOKIE_NAME}=tok-plain`);

        expect(readSessionTokenFromRequest(request)).toEqual({
            token: "tok-plain",
            cookieName: SESSION_COOKIE_NAME,
        });
    });
});
