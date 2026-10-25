/**
 * Tests du wrapper `lib/api-route.ts` — lot E1 (Prompt E : durcissement
 * `apiRoute`, audit §3 S-4/S-7).
 *
 * Contrats prouvés sur le WRAPPER RÉEL (route construite via `apiRoute`,
 * session signée réelle, Prisma mocké — même harness que
 * `payments-isolation.test.ts`) :
 *   1. 401 sans session ;
 *   2. 403 sans permission (rôle non-ADMIN sans la clé demandée) ;
 *   3. 422 `{ error, issues, success: false }` sur **body** invalide (422
 *      homogène de l'appli, cf. `GET /api/tresorerie`) ;
 *   4. 422 sur **query** invalide + passage typé de `body`/`query` validés
 *      au handler (`z.infer`, preuve runtime de la coercion) ;
 *   5. 500 **sans fuite de message** : le message d'exception n'apparaît PAS
 *      dans la réponse, un `requestId` y figure, et le détail part au logger
 *      (console) sous le même `requestId` ;
 *   6. route `authOnly: true` exécutée sans permission ;
 *   7. ordre des garde-fous : 401 avant la validation 422, 403 avant 422.
 *
 * Le typage `body`/`query` (jamais `any`) est vérifié au compile-time par le
 * fait même que le handler les utilise (`body.nom.toUpperCase()`,
 * `query.limit + 1`) : `undefined`/`unknown` ne compilerait pas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { z } from "zod";

// Prisma est instancié à l'import de lib/prisma.ts (DATABASE_URL requise) :
// le module est mocké entièrement (vi.mock est hoisté au-dessus des imports).
const db = vi.hoisted(() => ({
    userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: db.userFindUnique },
    },
}));

import { apiRoute } from "@/lib/api-route";
import { encodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/session-token";
import { clearUserSessionCache } from "@/lib/session-cache";

process.env.AUTH_SECRET = "secret-test-api-route-e1";

const COMPANY_A = "company-a";
const USER_A = "user-a";

/** Requête authentifiée (session réelle signée) — pattern payments-isolation. */
async function signedRequest(
    url: string,
    init: { method?: string; body?: unknown } = {},
): Promise<NextRequest> {
    const token = await encodeSessionToken(
        {
            emailVerified: null,
            id: USER_A,
            role: "ADMIN",
            companyId: COMPANY_A,
            permissions: [],
            allowedCompanyIds: [COMPANY_A],
            lastActivity: Date.now(),
            rememberMe: true,
        },
        SESSION_COOKIE_NAME,
    );
    const headers: Record<string, string> = { cookie: `${SESSION_COOKIE_NAME}=${token}` };
    if (init.body !== undefined) headers["content-type"] = "application/json";
    return new NextRequest(url, {
        method: init.method ?? "GET",
        headers,
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
}

/** Requête SANS cookie de session (non authentifiée). */
function anonymousRequest(url: string): NextRequest {
    return new NextRequest(url, { method: "GET" });
}

const noParams = (): { params: Promise<Record<string, string>> } => ({
    params: Promise.resolve({}),
});

/* ─── Routes de test (construites avec le wrapper réel) ───────────────────── */

const PermissionRoute = apiRoute.get({ permission: "clients:voir" }, async () => ({ ok: true }));

const AuthOnlyRoute = apiRoute.get({ authOnly: true }, async (_request, { session }) => ({
    userId: session.id,
}));

const BodyRoute = apiRoute.post(
    { permission: "clients:creer", schema: z.object({ nom: z.string().min(3) }) },
    async (_request, { body }) => ({ nomEnMajuscules: body.nom.toUpperCase() }),
);

const QueryRoute = apiRoute.get(
    {
        permission: "clients:voir",
        query: z.object({ limit: z.coerce.number().int().min(1).max(10) }),
    },
    async (_request, { query }) => ({ limite: query.limit + 1 }),
);

const SECRET_DETAIL =
    'DETAIL-PRIVA-NE-DOIT-PAS-FUITER: constraint "users_email_key" violated';
/** Marqueur indépendant des guillemets (les quotes sont échappées dans les JSON lines). */
const SECRET_MARKER = "DETAIL-PRIVA-NE-DOIT-PAS-FUITER";

const BoomRoute = apiRoute.get({ permission: "clients:voir" }, async () => {
    throw new Error(SECRET_DETAIL);
});

interface ErrorBody {
    error?: string;
    issues?: unknown[];
    success?: boolean;
    requestId?: string;
    ok?: boolean;
    userId?: string;
    nomEnMajuscules?: string;
    limite?: number;
}

beforeEach(() => {
    clearUserSessionCache();
    db.userFindUnique.mockReset();
    db.userFindUnique.mockResolvedValue({ actif: true, role: "ADMIN", permissions: [] });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("apiRoute — authentification", () => {
    it("401 { error } sans session", async () => {
        const res = await PermissionRoute(anonymousRequest("http://localhost/api/test"), noParams());

        expect(res.status).toBe(401);
        const body: ErrorBody = await res.json();
        expect(body.error).toBe("Non authentifié");
        expect(body.success).toBe(false);
    });

    it("401 avant toute validation de body (401 précède 422)", async () => {
        const res = await BodyRoute(
            new NextRequest("http://localhost/api/test", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ nom: "AB" }), // invalide : min(3)
            }),
            noParams(),
        );

        expect(res.status).toBe(401);
        const body: ErrorBody = await res.json();
        expect(body.error).toBe("Non authentifié");
        expect(body.issues).toBeUndefined();
    });
});

describe("apiRoute — permission (403)", () => {
    it("403 { error } sans la permission demandée (rôle USER, permissions vides)", async () => {
        db.userFindUnique.mockResolvedValue({ actif: true, role: "USER", permissions: [] });

        const res = await PermissionRoute(await signedRequest("http://localhost/api/test"), noParams());

        expect(res.status).toBe(403);
        const body: ErrorBody = await res.json();
        expect(body.error).toBe("Accès refusé : permission manquante");
        expect(body.success).toBe(false);
        expect(body.ok).toBeUndefined(); // handler non exécuté
    });

    it("403 précède la validation 422", async () => {
        db.userFindUnique.mockResolvedValue({ actif: true, role: "USER", permissions: [] });

        const res = await BodyRoute(
            await signedRequest("http://localhost/api/test", {
                method: "POST",
                body: { nom: "AB" }, // invalide : min(3)
            }),
            noParams(),
        );

        expect(res.status).toBe(403);
        const body: ErrorBody = await res.json();
        expect(body.issues).toBeUndefined();
    });

    it("200 avec la permission (rôle ADMIN : passe outre, handler exécuté)", async () => {
        const res = await PermissionRoute(await signedRequest("http://localhost/api/test"), noParams());

        expect(res.status).toBe(200);
        const body: ErrorBody = await res.json();
        expect(body.ok).toBe(true);
    });
});

describe("apiRoute — validation body (422 homogène { error, issues })", () => {
    it("422 sur body invalide avec tableau `issues` + contrat errorResponse", async () => {
        const res = await BodyRoute(
            await signedRequest("http://localhost/api/test", {
                method: "POST",
                body: { nom: "AB" }, // trop court
            }),
            noParams(),
        );

        expect(res.status).toBe(422);
        const body: ErrorBody = await res.json();
        expect(body.error).toBe("Données invalides");
        expect(body.success).toBe(false);
        expect(Array.isArray(body.issues)).toBe(true);
        expect(body.issues!.length).toBeGreaterThan(0);
        expect(body.nomEnMajuscules).toBeUndefined(); // handler non exécuté
    });

    it("200 avec un body valide : le handler reçoit `body` parsé (z.infer)", async () => {
        const res = await BodyRoute(
            await signedRequest("http://localhost/api/test", {
                method: "POST",
                body: { nom: "Alice" },
            }),
            noParams(),
        );

        expect(res.status).toBe(200);
        const body: ErrorBody = await res.json();
        expect(body.nomEnMajuscules).toBe("ALICE");
    });

    it("422 si le body JSON est absent (schéma requis)", async () => {
        const res = await BodyRoute(await signedRequest("http://localhost/api/test", { method: "POST" }), noParams());

        expect(res.status).toBe(422);
        const body: ErrorBody = await res.json();
        expect(body.error).toBe("Données invalides");
        expect(Array.isArray(body.issues)).toBe(true);
    });
});

describe("apiRoute — validation query", () => {
    it("422 sur query invalide (format non convertible) avec `issues`", async () => {
        const res = await QueryRoute(
            await signedRequest("http://localhost/api/test?limit=abc"),
            noParams(),
        );

        expect(res.status).toBe(422);
        const body: ErrorBody = await res.json();
        expect(body.error).toBe("Données invalides");
        expect(Array.isArray(body.issues)).toBe(true);
        expect(body.issues!.length).toBeGreaterThan(0);
    });

    it("422 sur query hors bornes (max 10)", async () => {
        const res = await QueryRoute(
            await signedRequest("http://localhost/api/test?limit=99"),
            noParams(),
        );

        expect(res.status).toBe(422);
        const body: ErrorBody = await res.json();
        expect(Array.isArray(body.issues)).toBe(true);
    });

    it("200 avec query valide : le handler reçoit `query` parsé et coercé (number)", async () => {
        const res = await QueryRoute(
            await signedRequest("http://localhost/api/test?limit=5"),
            noParams(),
        );

        expect(res.status).toBe(200);
        const body: ErrorBody = await res.json();
        expect(body.limite).toBe(6); // 5 (coercé en number) + 1
    });
});

describe("apiRoute — 500 sans fuite de message", () => {
    it("500 message générique + requestId, détail journalisé côté serveur uniquement", async () => {
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const res = await BoomRoute(await signedRequest("http://localhost/api/test"), noParams());

        expect(res.status).toBe(500);
        const raw = await res.text();
        // Le message d'exception ne FUIT jamais dans la réponse (même échappé).
        expect(raw).not.toContain(SECRET_MARKER);
        expect(raw).not.toContain("users_email_key");

        const body: ErrorBody = JSON.parse(raw) as ErrorBody;
        expect(body.error).toBe("Erreur serveur");
        expect(body.success).toBe(false);
        expect(typeof body.requestId).toBe("string");
        expect(body.requestId!.length).toBeGreaterThan(0);

        // … mais le détail EST journalisé, sous le MÊME requestId.
        expect(consoleErrorSpy).toHaveBeenCalled();
        const logged = consoleErrorSpy.mock.calls
            .map((call: unknown[]) => call.map((part) => String(part)).join(" "))
            .join("\n");
        expect(logged).toContain(SECRET_MARKER);
        expect(logged).toContain(body.requestId!);
    });
});

describe("apiRoute — authOnly (dérogation explicite)", () => {
    it("exécute le handler sans `permission` déclarée", async () => {
        const res = await AuthOnlyRoute(await signedRequest("http://localhost/api/test"), noParams());

        expect(res.status).toBe(200);
        const body: ErrorBody = await res.json();
        expect(body.userId).toBe(USER_A);
    });

    it("reste derrière le 401 (authentification exigée)", async () => {
        const res = await AuthOnlyRoute(anonymousRequest("http://localhost/api/test"), noParams());

        expect(res.status).toBe(401);
    });
});
