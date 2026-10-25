/**
 * Tests lot E3 — chiffrement des clés API (AES-256-GCM), garde-fou `••••`,
 * masquage exhaustif et routes `settings/app` (audit §3 S-5, exigence 7 du
 * Prompt E).
 *
 * Contrats prouvés :
 *   1. roundtrip `chiffrer` → `dechiffrer` (préfixe `enc:v1:`, IV aléatoire,
 *      clair JAMAIS stocké) + format `enc:v1:<iv>:<tag>:<ct>` ;
 *   2. lecture rétro-compatible des DEUX états : valeur en clair acceptée
 *      (fenêtre de migration), valeur chiffrée déchiffrée — détection par
 *      préfixe, jamais devinée ; env retirée sur une valeur chiffrée = erreur
 *      explicite, jamais une valeur fausse ;
 *   3. repli documenté `APP_KEYS_ENCRYPTION_KEY` absente : écriture en clair +
 *      `logger.warn` SANS la valeur de la clé ;
 *   4. garde-fou `••••` : une valeur masquée n'est JAMAIS réécrite en base ;
 *   5. masquage exhaustif GET/PUT (les 4 colonnes `*ApiKey`, `openrouterApiKey`
 *      comprise — fuite corrigée) + route status sans valeur ;
 *   6. Zod sur `PUT /api/settings/app` : body hors bornes → 422 homogène.
 *
 * Harness : wrapper `apiRoute` RÉEL + session signée réelle + Prisma mocké
 * (même patron que `api-route.test.ts` / `payments-isolation.test.ts`).
 * Toutes les valeurs de clé sont FACTICES (fixtures de test, aucun secret).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";

// Prisma est instancié à l'import de lib/prisma.ts (DATABASE_URL requise) :
// le module est mocké entièrement (vi.mock est hoisté au-dessus des imports).
const db = vi.hoisted(() => ({
    userFindUnique: vi.fn(),
    appSettingsFindFirst: vi.fn(),
    appSettingsCreate: vi.fn(),
    appSettingsUpdate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: db.userFindUnique },
        appSettings: {
            findFirst: db.appSettingsFindFirst,
            create: db.appSettingsCreate,
            update: db.appSettingsUpdate,
        },
    },
}));

import {
    chiffrer,
    dechiffrer,
    isChiffre,
    estMasquee,
    preparerClePourStockage,
    CIPHER_PREFIX,
    ENCRYPTION_ENV_VAR,
} from "@/lib/api-keys-crypto";
import { getApiKey, maskApiKey, maskAppSettingsKeys } from "@/lib/api-keys";
import { encodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/session-token";
import { clearUserSessionCache } from "@/lib/session-cache";
import { GET as GET_settings_app, PUT as PUT_settings_app } from "@/app/api/settings/app/route";
import { GET as GET_status_app } from "@/app/api/settings/app/status/route";

/* ─── Types & fixtures (valeurs FACTICES, aucun secret) ────────────────────── */

interface AppSettingsRow {
    id: string;
    alerteStockActif: boolean;
    alerteEcheanceJours: number;
    openaiApiKey: string | null;
    geminiApiKey: string | null;
    mistralApiKey: string | null;
    openrouterApiKey: string | null;
    updatedAt: Date;
}

/** Arguments observables de `prisma.appSettings.update` (jamais de `any`). */
interface UpdateCall {
    where: { id: string };
    data: Record<string, unknown>;
}

function ligneBrute(): AppSettingsRow {
    return {
        id: "app-settings-1",
        alerteStockActif: true,
        alerteEcheanceJours: 7,
        openaiApiKey: "sk-BRUT-OPENAI-1234",
        geminiApiKey: "AIza-BRUT-GEMINI-5678",
        mistralApiKey: "mistral-BRUT-9012",
        openrouterApiKey: "or-BRUT-OPENROUTER-3456",
        updatedAt: new Date("2026-10-23T00:00:00.000Z"),
    };
}

/** Sémantique Prisma exacte : `undefined` = ne pas modifier la colonne. */
function champCle(valeur: unknown, actuel: string | null): string | null {
    if (typeof valeur === "string") return valeur;
    if (valeur === null) return null;
    return actuel;
}

/** Simule `appSettings.update` : applique les champs définis sur la ligne. */
function appliqueUpdate(bruts: AppSettingsRow, data: Record<string, unknown>): AppSettingsRow {
    return {
        ...bruts,
        alerteStockActif:
            typeof data.alerteStockActif === "boolean" ? data.alerteStockActif : bruts.alerteStockActif,
        alerteEcheanceJours:
            typeof data.alerteEcheanceJours === "number"
                ? data.alerteEcheanceJours
                : bruts.alerteEcheanceJours,
        openaiApiKey: champCle(data.openaiApiKey, bruts.openaiApiKey),
        geminiApiKey: champCle(data.geminiApiKey, bruts.geminiApiKey),
        mistralApiKey: champCle(data.mistralApiKey, bruts.mistralApiKey),
        openrouterApiKey: champCle(data.openrouterApiKey, bruts.openrouterApiKey),
    };
}

/* ─── Harness session (identique api-route.test.ts) ────────────────────────── */

process.env.AUTH_SECRET = "secret-test-api-keys-e3";

const COMPANY_A = "company-a";
const USER_A = "user-a";

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

const noParams = (): { params: Promise<Record<string, string>> } => ({
    params: Promise.resolve({}),
});

/* ─── Environnement ────────────────────────────────────────────────────────── */

const PROVIDER_ENV_KEYS = [
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "MISTRAL_API_KEY",
    "OPENROUTER_API_KEY",
] as const;

let savedEnv: Record<string, string | undefined>;

function lireErreurJson(res: Response): Promise<Record<string, unknown>> {
    return res.json() as Promise<Record<string, unknown>>;
}

beforeEach(() => {
    clearUserSessionCache();

    // Isolation env : providers retirés (la DB doit pouvoir être prioritaire)
    // + valeur de clé de chiffrement GÉNÉRÉE à chaque test (aucun secret en dur).
    savedEnv = {};
    for (const cle of [...PROVIDER_ENV_KEYS, ENCRYPTION_ENV_VAR]) {
        savedEnv[cle] = process.env[cle];
        delete process.env[cle];
    }
    process.env[ENCRYPTION_ENV_VAR] = randomBytes(32).toString("base64");

    db.userFindUnique.mockReset();
    db.userFindUnique.mockResolvedValue({ actif: true, role: "ADMIN", permissions: [] });
    db.appSettingsFindFirst.mockReset();
    db.appSettingsFindFirst.mockResolvedValue(ligneBrute());
    db.appSettingsCreate.mockReset();
    db.appSettingsCreate.mockResolvedValue(ligneBrute());
    db.appSettingsUpdate.mockReset();
    db.appSettingsUpdate.mockImplementation(
        async (call: UpdateCall): Promise<AppSettingsRow> =>
            appliqueUpdate(ligneBrute(), call.data),
    );
});

afterEach(() => {
    for (const cle of [...PROVIDER_ENV_KEYS, ENCRYPTION_ENV_VAR]) {
        if (savedEnv[cle] === undefined) delete process.env[cle];
        else process.env[cle] = savedEnv[cle];
    }
    vi.restoreAllMocks();
});

/* ─── 1. Chiffrement AES-256-GCM ───────────────────────────────────────────── */

describe("chiffrer / dechiffrer — AES-256-GCM", () => {
    it("roundtrip chiffrer → déchiffrer : préfixe enc:v1:, clair jamais stocké, IV aléatoire", () => {
        const clair = "sk-factice-roundtrip-98765";
        const stocke = chiffrer(clair);

        expect(isChiffre(stocke)).toBe(true);
        expect(stocke.startsWith(CIPHER_PREFIX)).toBe(true);
        expect(stocke).not.toContain(clair); // gaspillage impossible : le clair n'apparaît pas
        expect(dechiffrer(stocke)).toBe(clair);

        // Deux chiffrements d'un même texte diffèrent (IV 12 o aléatoire) :
        // aucun pattern réutilisable détectable en base.
        expect(chiffrer(clair)).not.toBe(stocke);
    });

    it("format enc:v1:<iv>:<tag>:<ct> : 3 segments base64, IV 12 o, tag GCM 16 o", () => {
        const stocke = chiffrer("sk-factice-format");
        const segments = stocke.slice(CIPHER_PREFIX.length).split(":");

        expect(segments).toHaveLength(3);
        expect(Buffer.from(segments[0], "base64")).toHaveLength(12);
        expect(Buffer.from(segments[1], "base64")).toHaveLength(16);
        expect(Buffer.from(segments[2], "base64").length).toBeGreaterThan(0);
    });

    it("valeur en clair acceptée (rétro-compat) : pas de préfixe → retournée telle quelle", () => {
        const brut = "sk-factice-en-clair";
        expect(isChiffre(brut)).toBe(false);
        expect(dechiffrer(brut)).toBe(brut); // état d'avant-migration, sans déchiffrage
    });

    it("préfixe inconnu (enc:v2:) non deviné : traité comme en clair (jamais interprété à tort)", () => {
        const futur = "enc:v2:AAAA:BBBB:CCCC";
        expect(isChiffre(futur)).toBe(false);
        expect(dechiffrer(futur)).toBe(futur);
    });

    it("env absente : repli en clair documenté + logger.warn SANS la valeur de la clé", () => {
        delete process.env[ENCRYPTION_ENV_VAR];
        const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const clair = "sk-factice-repli-111";
        expect(chiffrer(clair)).toBe(clair); // repli : écriture non chiffrée, aucun 500

        const logs = spyWarn.mock.calls
            .map((call: unknown[]) => call.map(String).join(" "))
            .join("\n");
        expect(logs).toContain("APP_KEYS_ENCRYPTION_KEY");
        expect(logs).not.toContain(clair); // la valeur de la clé n'est jamais journalisée
    });

    it("env absente sur une valeur chiffrée : erreur explicite, jamais de valeur fausse retournée", () => {
        const stocke = chiffrer("sk-factice-avant-retrait-222"); // env encore posée
        delete process.env[ENCRYPTION_ENV_VAR];

        expect(() => dechiffrer(stocke)).toThrow(/APP_KEYS_ENCRYPTION_KEY/);
    });

    it("donnée altérée : authentification GCM échoue, pas de déchiffrement silencieux", () => {
        const stocke = chiffrer("sk-factice-integrite-333");
        const segments = stocke.slice(CIPHER_PREFIX.length).split(":");
        const ct = Buffer.from(segments[2], "base64");
        ct[0] = ct[0] ^ 0xff; // corruption d'un octet du ciphertext
        segments[2] = ct.toString("base64");
        const corrompu = `${CIPHER_PREFIX}${segments.join(":")}`;

        expect(isChiffre(corrompu)).toBe(true);
        expect(() => dechiffrer(corrompu)).toThrow();
    });
});

/* ─── 2. Garde-fou •••• + préparation d'écriture ────────────────────────────── */

describe("preparerClePourStockage — garde-fou `••••` (règle 1)", () => {
    it("valeur masquée renvoyée par GET → `undefined` : JAMAIS réécrite en base", () => {
        expect(estMasquee("••••••••1234")).toBe(true);
        expect(preparerClePourStockage("••••••••1234")).toBeUndefined();
        expect(preparerClePourStockage("••••")).toBeUndefined(); // masque court
    });

    it("nouvelle clé réelle → chiffrée (roundtrip possible, clair jamais stocké)", () => {
        const stocke = preparerClePourStockage("sk-factice-neuve-444");
        expect(typeof stocke).toBe("string");
        expect(isChiffre(String(stocke))).toBe(true);
        expect(String(stocke)).not.toContain("sk-factice-neuve-444");
        expect(dechiffrer(String(stocke))).toBe("sk-factice-neuve-444");
    });

    it("effacements explicites : chaîne vide → vide NON chiffrée, null → null, absent → undefined", () => {
        expect(preparerClePourStockage("")).toBe(""); // "" chiffré ferait « configuré » à tort
        expect(preparerClePourStockage(null)).toBeNull();
        expect(preparerClePourStockage(undefined)).toBeUndefined();
    });

    it("env absente : repli en clair documenté + warn à l'écriture", () => {
        delete process.env[ENCRYPTION_ENV_VAR];
        const spyWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

        expect(preparerClePourStockage("sk-factice-repli-555")).toBe("sk-factice-repli-555");
        expect(spyWarn).toHaveBeenCalled();
    });
});

/* ─── 3. Lecture rétro-compatible des deux états (getApiKey) ────────────────── */

describe("getApiKey — lecture rétro-compatible (décryptage, 2 états)", () => {
    it("état chiffré en base → déchiffré avec la clé env posée", async () => {
        const clair = "sk-factice-db-chiffre-666";
        db.appSettingsFindFirst.mockResolvedValue({
            ...ligneBrute(),
            openaiApiKey: chiffrer(clair),
        });
        vi.spyOn(console, "warn").mockImplementation(() => {});

        await expect(getApiKey("openai")).resolves.toBe(clair);
    });

    it("état en clair en base (avant-migration) → retournée telle quelle", async () => {
        db.appSettingsFindFirst.mockResolvedValue({
            ...ligneBrute(),
            openaiApiKey: "sk-factice-db-clair-777",
        });
        vi.spyOn(console, "warn").mockImplementation(() => {});

        await expect(getApiKey("openai")).resolves.toBe("sk-factice-db-clair-777");
    });

    it("priorité env > DB inchangée", async () => {
        process.env.OPENAI_API_KEY = "sk-factice-env-prioritaire";
        db.appSettingsFindFirst.mockResolvedValue({
            ...ligneBrute(),
            openaiApiKey: chiffrer("sk-factice-db-ignorer"),
        });

        await expect(getApiKey("openai")).resolves.toBe("sk-factice-env-prioritaire");
    });

    it("valeur chiffrée + env retirée → `null` (aucune exception propagée, aucun 500)", async () => {
        db.appSettingsFindFirst.mockResolvedValue({
            ...ligneBrute(),
            openaiApiKey: chiffrer("sk-factice-sans-env-888"), // chiffrement AVANT retrait
        });
        delete process.env[ENCRYPTION_ENV_VAR];
        vi.spyOn(console, "warn").mockImplementation(() => {});
        vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(getApiKey("openai")).resolves.toBeNull();
    });
});

/* ─── 4. Masquage exhaustif des colonnes de clés ────────────────────────────── */

describe("maskApiKey / maskAppSettingsKeys — masquage exhaustif (règle 2)", () => {
    it("maskApiKey : `••••••••` + 4 derniers caractères uniquement", () => {
        expect(maskApiKey("sk-abcdefgh")).toBe("••••••••efgh");
        expect(maskApiKey("abc")).toBe("••••••••"); // valeur courte : tout masqué
        expect(maskApiKey("")).toBeNull();
        expect(maskApiKey(null)).toBeNull();
    });

    it("maskAppSettingsKeys : les 4 colonnes sont masquées, alertes et dates intacts", () => {
        const masque = maskAppSettingsKeys(ligneBrute());

        expect(masque.openaiApiKey).toBe("••••••••1234");
        expect(masque.geminiApiKey).toBe("••••••••5678");
        expect(masque.mistralApiKey).toBe("••••••••9012");
        expect(masque.openrouterApiKey).toBe("••••••••3456"); // fuite corrigée lot E3
        expect(masque.alerteStockActif).toBe(true);
        expect(masque.alerteEcheanceJours).toBe(7);
        expect(masque.id).toBe("app-settings-1");
    });
});

/* ─── 5. Routes réelles GET/PUT /api/settings/app + status ─────────────────── */

describe("GET/PUT /api/settings/app — routes réelles (wrapper apiRoute)", () => {
    it("GET : les 4 colonnes masquées, openrouterApiKey n'est plus renvoyée en clair", async () => {
        const res = await GET_settings_app(
            await signedRequest("http://localhost/api/settings/app"),
            noParams(),
        );

        expect(res.status).toBe(200);
        const texte = await res.text();
        const body = JSON.parse(texte) as { settings: Partial<AppSettingsRow> };

        expect(body.settings.openaiApiKey).toBe("••••••••1234");
        expect(body.settings.geminiApiKey).toBe("••••••••5678");
        expect(body.settings.mistralApiKey).toBe("••••••••9012");
        expect(body.settings.openrouterApiKey).toBe("••••••••3456");
        // Aucune valeur brute dans la réponse (les 4 colonnes) :
        for (const brut of [
            "sk-BRUT-OPENAI-1234",
            "AIza-BRUT-GEMINI-5678",
            "mistral-BRUT-9012",
            "or-BRUT-OPENROUTER-3456",
        ]) {
            expect(texte).not.toContain(brut);
        }
    });

    it("PUT : valeurs masquées `••••` → AUCUNE colonne de clé écrite ; réponse masquée", async () => {
        // Le formulaire renvoie exactement ce que GET lui a donné (masques inclus).
        const corps = {
            alerteStockActif: false,
            alerteEcheanceJours: 30,
            openaiApiKey: "••••••••1234",
            geminiApiKey: "••••••••5678",
            mistralApiKey: "••••••••9012",
            openrouterApiKey: "••••••••3456",
        };
        const res = await PUT_settings_app(
            await signedRequest("http://localhost/api/settings/app", {
                method: "PUT",
                body: corps,
            }),
            noParams(),
        );

        expect(res.status).toBe(200);

        // 1. Garde-fou : aucune colonne de clé n'est écrite (prisma ignore `undefined`).
        const appel = db.appSettingsUpdate.mock.calls[0]?.[0] as UpdateCall | undefined;
        expect(appel).toBeDefined();
        expect(appel?.data.openaiApiKey).toBeUndefined();
        expect(appel?.data.geminiApiKey).toBeUndefined();
        expect(appel?.data.mistralApiKey).toBeUndefined();
        expect(appel?.data.openrouterApiKey).toBeUndefined();
        // …mais les alertes sont écrites.
        expect(appel?.data.alerteStockActif).toBe(false);
        expect(appel?.data.alerteEcheanceJours).toBe(30);

        // 2. La réponse ne contient aucune clé en clair (masquée, 4 colonnes).
        const texte = await res.text();
        const body = JSON.parse(texte) as { settings: Partial<AppSettingsRow> };
        expect(body.settings.openaiApiKey).toBe("••••••••1234");
        expect(body.settings.openrouterApiKey).toBe("••••••••3456");
        expect(texte).not.toContain("sk-BRUT-OPENAI-1234");
        expect(texte).not.toContain("or-BRUT-OPENROUTER-3456");
    });

    it("PUT : nouvelle clé réelle → chiffrée en base, jamais en clair dans la réponse", async () => {
        const corps = {
            alerteStockActif: true,
            alerteEcheanceJours: 7,
            openaiApiKey: "sk-factice-a-enregistrer-9999",
        };
        const res = await PUT_settings_app(
            await signedRequest("http://localhost/api/settings/app", {
                method: "PUT",
                body: corps,
            }),
            noParams(),
        );

        expect(res.status).toBe(200);

        const appel = db.appSettingsUpdate.mock.calls[0]?.[0] as UpdateCall | undefined;
        const ecrit = appel?.data.openaiApiKey;
        expect(typeof ecrit).toBe("string");
        expect(isChiffre(String(ecrit))).toBe(true);
        expect(String(ecrit)).not.toContain("sk-factice-a-enregistrer-9999");

        const texte = await res.text();
        expect(texte).not.toContain("sk-factice-a-enregistrer-9999");
    });

    it("PUT : body hors bornes (alerteEcheanceJours) → 422 homogène, 0 écriture", async () => {
        const res = await PUT_settings_app(
            await signedRequest("http://localhost/api/settings/app", {
                method: "PUT",
                body: { alerteStockActif: true, alerteEcheanceJours: 999 },
            }),
            noParams(),
        );

        expect(res.status).toBe(422);
        const body = await lireErreurJson(res);
        expect(body.error).toBe("Données invalides");
        expect(body.success).toBe(false);
        expect(Array.isArray(body.issues)).toBe(true);
        expect(db.appSettingsUpdate).not.toHaveBeenCalled();
    });

    it("GET /api/settings/app/status : aucun champ de valeur de clé (config/source seulement)", async () => {
        const res = await GET_status_app(
            await signedRequest("http://localhost/api/settings/app/status"),
            noParams(),
        );

        expect(res.status).toBe(200);
        const texte = await res.text();
        const body = JSON.parse(texte) as {
            status: Record<string, { configured: boolean; source: string }>;
        };
        expect(body.status.openai).toEqual({ configured: true, source: "db" });
        expect(body.status.openrouter).toEqual({ configured: true, source: "db" });
        expect(texte).not.toContain("sk-BRUT-OPENAI-1234");
        expect(texte).not.toContain("or-BRUT-OPENROUTER-3456");
    });
});
