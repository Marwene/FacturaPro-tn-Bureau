import { describe, it, expect, afterEach } from "vitest";
import { SignJWT } from "jose";

import {
    createSessionMarker,
    markerSatisfied,
    readSessionMarker,
    SECURE_SESSION_MARKER_COOKIE_NAME,
    SESSION_MARKER_COOKIE_NAME,
    sessionMarkerCookieName,
    verifySessionMarker,
} from "@/lib/session-marker";
import {
    decodeSessionToken,
    encodeSessionToken,
    SECURE_SESSION_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    type SessionCookieName,
    type SessionTokenSource,
} from "@/lib/session-token";
import type { JWT } from "next-auth/jwt";

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

function cookiesOf(entries: Record<string, string>): { get(name: string): { value: string } | undefined } {
    return {
        get: (name: string) => (name in entries ? { value: entries[name] as string } : undefined),
    };
}

afterEach(() => {
    process.env.AUTH_SECRET = ORIGINAL_SECRET;
});

interface UserTokenOptions {
    id?: string;
    rememberMe?: boolean;
    lastActivity?: number;
    cookieName?: SessionCookieName;
}

/**
 * Jeton d'auth **réellement encodé** (next-auth `encode`, salt dérivé du nom du
 * cookie) — même pipeline que `proxy.ts` / `login-action.ts`, aucun jeton
 * fabriqué à la main.
 */
async function encodedTokenFor(options: UserTokenOptions = {}): Promise<string> {
    return encodeSessionToken(
        {
            id: options.id ?? "user-1",
            role: "ADMIN",
            companyId: "company-1",
            permissions: [],
            allowedCompanyIds: ["company-1"],
            emailVerified: null,
            rememberMe: options.rememberMe ?? false,
            lastActivity: options.lastActivity ?? Date.now(),
        },
        options.cookieName ?? SESSION_COOKIE_NAME
    );
}

/** JWT **décodé** (via `decodeSessionToken`, comme `proxy.ts`) — la forme attendue par create/verifySessionMarker. */
async function decodedTokenFor(options: UserTokenOptions = {}): Promise<JWT> {
    const cookieName = options.cookieName ?? SESSION_COOKIE_NAME;
    const token = await decodeSessionToken({ token: await encodedTokenFor(options), cookieName });
    if (token === null) throw new Error("token de test non décodable");
    return token;
}

describe("createSessionMarker / verifySessionMarker", () => {
    it("cycle create → verify avec le même jeton décodé (cookie non sécurisé et __Secure-)", async () => {
        process.env.AUTH_SECRET = "secret-de-test-marker-1";

        // Le salt JWT dépend du nom du cookie lu : les deux noms passent par le
        // même cycle, le `bind` ne dépend que des claims stables décodés.
        for (const cookieName of [SESSION_COOKIE_NAME, SECURE_SESSION_COOKIE_NAME] as const) {
            const token = await decodedTokenFor({ id: `user-${cookieName}`, cookieName });
            const marker = await createSessionMarker(token);
            expect(await verifySessionMarker(marker, token)).toBe(true);
        }
    });

    it("PIVOT : le marqueur survit à la rotation automatique du JWT par Auth.js (token_v1 → token_v2)", async () => {
        process.env.AUTH_SECRET = "secret-de-test-marker-rotation";

        // Mêmes claims stables (id + rememberMe), valeurs/JWS différentes :
        // Auth.js re-signe le JWT à chaque lecture de session (`lastActivity`
        // est réécrit par le callback `jwt` de `lib/auth.ts`).
        const rawV1 = await encodedTokenFor({ lastActivity: 1_700_000_000_000 });
        const rawV2 = await encodedTokenFor({ lastActivity: 1_700_000_300_000 });
        expect(rawV2).not.toBe(rawV1);

        const tokenV1 = await decodeSessionToken({ token: rawV1, cookieName: SESSION_COOKIE_NAME });
        const tokenV2 = await decodeSessionToken({ token: rawV2, cookieName: SESSION_COOKIE_NAME });
        if (tokenV1 === null || tokenV2 === null) throw new Error("tokens de test non décodables");

        const marker = await createSessionMarker(tokenV1);
        expect(await verifySessionMarker(marker, tokenV2)).toBe(true);
    });

    it("refuse un marqueur d'un AUTRE utilisateur (id différent, même rememberMe) — séparation", async () => {
        process.env.AUTH_SECRET = "secret-de-test-marker-2";

        const marker = await createSessionMarker(await decodedTokenFor({ id: "user-1" }));

        expect(await verifySessionMarker(marker, await decodedTokenFor({ id: "user-2" }))).toBe(false);
        // Même id mais autre valeur de flag → autre empreinte également.
        expect(
            await verifySessionMarker(marker, await decodedTokenFor({ id: "user-1", rememberMe: true }))
        ).toBe(false);
    });

    it("refuse un marqueur altéré (payload ou signature)", async () => {
        process.env.AUTH_SECRET = "secret-de-test-marker-3";

        const token = await decodedTokenFor();
        const marker = await createSessionMarker(token);
        const parts = marker.split(".");
        const header = parts[0] ?? "";
        const payload = parts[1] ?? "";
        const signature = parts[2] ?? "";
        expect(header).not.toBe("");
        expect(payload).not.toBe("");
        expect(signature).not.toBe("");

        const tamperedPayload = `${header}.${`${payload.slice(0, -2)}AA`}.${signature}`;
        expect(await verifySessionMarker(tamperedPayload, token)).toBe(false);
        expect(await verifySessionMarker(`${header}.${payload}.AA`, token)).toBe(false);
    });

    it("refuse un marqueur signé avec un autre AUTH_SECRET", async () => {
        process.env.AUTH_SECRET = "secret-ancien";
        const token = await decodedTokenFor();
        const marker = await createSessionMarker(token);

        process.env.AUTH_SECRET = "secret-nouveau";
        expect(await verifySessionMarker(marker, token)).toBe(false);
    });

    it("refuse une valeur non signée (ex: l'ancien cookie client « 1 »)", async () => {
        process.env.AUTH_SECRET = "secret-de-test-marker-4";

        expect(await verifySessionMarker("1", await decodedTokenFor())).toBe(false);
    });

    it("ne lève jamais sur un jeton d'auth corrompu passé à la vérification", async () => {
        process.env.AUTH_SECRET = "secret-de-test-marker-5";

        const token = await decodedTokenFor();
        const marker = await createSessionMarker(token);
        expect(await verifySessionMarker(marker, token)).toBe(true);

        // Claims vidés (jeton déchiffré mais non conforme) : comparaison fausse,
        // jamais une exception.
        expect(await verifySessionMarker(marker, { name: "corrompu" } as JWT)).toBe(false);
    });
});

describe("readSessionMarker", () => {
    it("priorise le cookie __Secure- (production HTTPS)", () => {
        const jar = cookiesOf({
            [SESSION_MARKER_COOKIE_NAME]: "marker-plain",
            [SECURE_SESSION_MARKER_COOKIE_NAME]: "marker-secure",
        });

        expect(readSessionMarker(jar)).toBe("marker-secure");
    });

    it("retombe sur le cookie non sécurisé (local HTTP)", () => {
        expect(readSessionMarker(cookiesOf({ [SESSION_MARKER_COOKIE_NAME]: "marker-plain" })))
            .toBe("marker-plain");
    });

    it("retourne null sans marqueur", () => {
        expect(readSessionMarker(cookiesOf({}))).toBeNull();
    });
});

describe("sessionMarkerCookieName", () => {
    it("choisit le nom selon le protocole", () => {
        expect(sessionMarkerCookieName(true)).toBe(SECURE_SESSION_MARKER_COOKIE_NAME);
        expect(sessionMarkerCookieName(false)).toBe(SESSION_MARKER_COOKIE_NAME);
    });
});

describe("durée de vie du marqueur (C4)", () => {
    /** Re-dérivation de la clé HMAC — même schéma que `lib/session-marker.ts` (constante privée) : permet de fabriquer, depuis les tests, un marqueur "serveur" doté d'un `exp` passé. */
    async function forgeMarkerKey(secret: string): Promise<CryptoKey> {
        const material = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode("facturapro:session-marker:v1:" + secret)
        );
        return crypto.subtle.importKey(
            "raw",
            material,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign", "verify"]
        );
    }

    it("rejette un marqueur signé avec la BONNE clé mais dont le claim exp est passé", async () => {
        process.env.AUTH_SECRET = "secret-de-test-marker-exp";

        const expired = await new SignJWT({ bind: "ZmFrZS1iaW5kaW5n" })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuer("facturapro-session-marker")
            .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
            .sign(await forgeMarkerKey("secret-de-test-marker-exp"));

        expect(await verifySessionMarker(expired, await decodedTokenFor())).toBe(false);
    });

    it("createSessionMarker ne pose AUCUN claim exp (durée de vie = session cookie httpOnly)", async () => {
        process.env.AUTH_SECRET = "secret-de-test-marker-noexp";

        const marker = await createSessionMarker(await decodedTokenFor());
        const payloadSegment = marker.split(".")[1];
        expect(payloadSegment).toBeDefined();
        // jose v6 : base64url.decode renvoie un Uint8Array — décodage manuel en UTF-8.
        const payload = JSON.parse(
            Buffer.from(payloadSegment as string, "base64url").toString("utf-8")
        ) as Record<string, unknown>;

        expect(payload.exp).toBeUndefined();
        expect(payload.iss).toBe("facturapro-session-marker");
        expect(typeof payload.bind).toBe("string");
    });
});

describe("markerSatisfied (helper partagé — proxy.ts et page /login)", () => {
    function sourceFor(token: string): SessionTokenSource {
        return { token, cookieName: SESSION_COOKIE_NAME };
    }

    /**
     * JWT décodé minimal conforme à l'augmentation `types/next-auth.d.ts`
     * (id/role/companyId/emailVerified/permissions obligatoires) SANS le champ
     * `rememberMe` : couvre le cas « champ absent » (règle `!== false`), là où
     * les autres cas utilisent des tokens réellement encodés/décodés.
     */
    function jwtWithoutRememberMe(): JWT {
        return {
            id: "user-1",
            role: "ADMIN",
            companyId: "company-1",
            emailVerified: null,
            permissions: [],
        };
    }

    it("rememberMe !== false → true SANS lire de marqueur (jar vide)", async () => {
        process.env.AUTH_SECRET = "secret-marker-satisfied-1";
        const empty = cookiesOf({});

        expect(
            await markerSatisfied(
                empty,
                sourceFor("jeton-nimporte-lequel"),
                await decodedTokenFor({ rememberMe: true })
            )
        ).toBe(true);
        // Champ absent (undefined) → même règle que `!== false` : aucun marqueur exigé.
        expect(await markerSatisfied(empty, sourceFor("jeton-nimporte-lequel"), jwtWithoutRememberMe())).toBe(true);
    });

    it("rememberMe === false + marqueur signé lié au jeton → true", async () => {
        process.env.AUTH_SECRET = "secret-marker-satisfied-2";
        const raw = await encodedTokenFor();
        const token = await decodedTokenFor();
        const marker = await createSessionMarker(token);
        const jar = cookiesOf({ [SESSION_MARKER_COOKIE_NAME]: marker });

        expect(await markerSatisfied(jar, sourceFor(raw), token)).toBe(true);
    });

    it("PIVOT : marqueur créé sur token_v1 → satisfait sur token_v2 (rotation Auth.js, même utilisateur)", async () => {
        process.env.AUTH_SECRET = "secret-marker-satisfied-rotation";
        const rawV1 = await encodedTokenFor({ lastActivity: 1_700_000_000_000 });
        const rawV2 = await encodedTokenFor({ lastActivity: 1_700_000_300_000 });
        // Garde-fou de couverture : les deux sessions doivent être des JWS réellement distincts.
        expect(rawV1).not.toBe(rawV2);
        const tokenV1 = await decodedTokenFor({ lastActivity: 1_700_000_000_000 });
        const tokenV2 = await decodedTokenFor({ lastActivity: 1_700_000_300_000 });

        const marker = await createSessionMarker(tokenV1);
        const jar = cookiesOf({ [SESSION_MARKER_COOKIE_NAME]: marker });

        expect(await markerSatisfied(jar, sourceFor(rawV2), tokenV2)).toBe(true);
    });

    it("rememberMe === false + marqueur ABSENT → false (reconnexion forcée)", async () => {
        process.env.AUTH_SECRET = "secret-marker-satisfied-3";
        const raw = await encodedTokenFor();

        expect(
            await markerSatisfied(cookiesOf({}), sourceFor(raw), await decodedTokenFor())
        ).toBe(false);
    });

    it("rememberMe === false + marqueur d'un AUTRE utilisateur → false (non réutilisable)", async () => {
        process.env.AUTH_SECRET = "secret-marker-satisfied-4";
        const raw = await encodedTokenFor();
        const token = await decodedTokenFor();
        const foreignMarker = await createSessionMarker(await decodedTokenFor({ id: "user-2" }));
        const jar = cookiesOf({ [SESSION_MARKER_COOKIE_NAME]: foreignMarker });

        expect(await markerSatisfied(jar, sourceFor(raw), token)).toBe(false);
    });

    it("garde défensif : source SANS valeur de jeton → false, même avec un marqueur valide", async () => {
        process.env.AUTH_SECRET = "secret-marker-satisfied-guard";
        const token = await decodedTokenFor();
        const marker = await createSessionMarker(token);
        const jar = cookiesOf({ [SESSION_MARKER_COOKIE_NAME]: marker });

        expect(await markerSatisfied(jar, sourceFor(""), token)).toBe(false);
    });
});
