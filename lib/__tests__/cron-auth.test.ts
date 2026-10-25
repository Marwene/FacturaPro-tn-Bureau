/**
 * Tests de la garde d'authentification des routes `app/api/cron/*` —
 * lot E4 (Prompt E, audit §3 S-8, exigence 5 « Crons »).
 *
 * Contrats prouvés sur les 3 routes RÉELLES (handlers importés depuis
 * `app/api/cron/**` — même harness que `payments-isolation.test.ts` et
 * `api-route.test.ts` : Prisma + logique métier mockés) :
 *   (a) `CRON_SECRET` absente → 401, ZÉRO appel DB ni effet de bord ;
 *   (b) `CRON_SECRET` posée + header absent/incorrect → 401, ZÉRO appel ;
 *   (c) `CRON_SECRET` posée + `Bearer` correct → la route PASSE et exécute
 *       son handler métier (réponses inchangées) ;
 *   (d) non-fuite : corps de refus identique dans les deux causes, sans la
 *       valeur du secret ni de mention « variable absente » ; les deux causes
 *       ne sont distinguées QUE dans le log serveur, sans valeur.
 *
 * Aucun secret réel : `TEST_SECRET` est un fixture de test.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Prisma est instancié à l'import de lib/prisma.ts (DATABASE_URL requise) :
// le module est mocké entièrement (vi.mock est hoisté au-dessus des imports).
const db = vi.hoisted(() => ({
    effetFindMany: vi.fn(),
    effetUpdate: vi.fn(),
    userFindMany: vi.fn(),
    notificationCreateMany: vi.fn(),
}));

// Logique métier des 3 routes (jamais exécutée derrière une garde refusée).
const business = vi.hoisted(() => ({
    sendEmail: vi.fn(),
    relancerAlertesEcartOuvertes: vi.fn(),
    refreshTMM: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        effet: { findMany: db.effetFindMany, update: db.effetUpdate },
        user: { findMany: db.userFindMany },
        notification: { createMany: db.notificationCreateMany },
    },
}));

vi.mock("@/lib/email", () => ({ sendEmail: business.sendEmail }));

vi.mock("@/lib/bon-commande/reconciliation", () => ({
    relancerAlertesEcartOuvertes: business.relancerAlertesEcartOuvertes,
}));

vi.mock("@/lib/tmm-bct", () => ({ refreshTMM: business.refreshTMM }));

import { GET as cronCheckEcheances } from "@/app/api/cron/check-echeances/route";
import { GET as cronRelanceEcartBc } from "@/app/api/cron/check-echeances/relance-ecart-bc/route";
import { GET as cronTmmBct } from "@/app/api/cron/tmm-bct/route";

/* ─── Environnement ─────────────────────────────────────────────────────────── */

/** Fixture de test — PAS un secret réel (aucune valeur de secret dans le dépôt). */
const TEST_SECRET = "fixture-cron-secret-e4";

const ORIGINAL_SECRET = process.env.CRON_SECRET;
const ORIGINAL_LOG_LEVEL = process.env.LOG_LEVEL;

function setSecret(value: string | undefined): void {
    if (value === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = value;
}

beforeAll(() => {
    // Déterministe : le logger lit LOG_LEVEL à chaque émission.
    process.env.LOG_LEVEL = "info";
});

afterAll(() => {
    setSecret(ORIGINAL_SECRET);
    if (ORIGINAL_LOG_LEVEL === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = ORIGINAL_LOG_LEVEL;
});

beforeEach(() => {
    vi.clearAllMocks();
    setSecret(TEST_SECRET);
    // Implémentations réinstallées après le restoreAllMocks de l'test précédent.
    db.effetFindMany.mockResolvedValue([]);
    business.relancerAlertesEcartOuvertes.mockResolvedValue(0);
    business.refreshTMM.mockResolvedValue({
        tmm: "8,25",
        date: new Date("2026-10-23T00:00:00.000Z"),
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

type CronRouteHandler = (request: NextRequest) => Promise<Response>;

interface CronRouteCase {
    name: string;
    handler: CronRouteHandler;
}

const CRON_ROUTES: CronRouteCase[] = [
    { name: "cron/check-echeances", handler: cronCheckEcheances },
    { name: "cron/check-echeances/relance-ecart-bc", handler: cronRelanceEcartBc },
    { name: "cron/tmm-bct", handler: cronTmmBct },
];

function cronRequest(headers: Record<string, string> = {}): NextRequest {
    return new NextRequest("http://localhost:3000/api/cron/test", { headers });
}

function bearerHeader(secret: string): Record<string, string> {
    return { authorization: `Bearer ${secret}` };
}

interface RefusalBody {
    error?: string;
    success?: boolean;
    details?: unknown;
}

/** 401 + corps de refus GÉNÉRIQUE : ni valeur de secret, ni état de la variable. */
async function expectRefusal(
    handler: CronRouteHandler,
    headers: Record<string, string>,
): Promise<void> {
    const response = await handler(cronRequest(headers));

    expect(response.status).toBe(401);
    const raw = await response.text();
    const body: RefusalBody = JSON.parse(raw) as RefusalBody;
    expect(body.error).toBe("Non autorisé");
    expect(body.success).toBe(false);
    expect(body.details).toBeUndefined();
    // Aucune fuite côté protocole : ni la valeur, ni l'absence de la variable.
    expect(raw).not.toContain(TEST_SECRET);
    expect(raw).not.toMatch(/absent|absente|variable|env\b|configur/i);
}

/** Aucun accès DB ni effet de bord métier (toutes routes confondues). */
function expectNoSideEffect(): void {
    expect(db.effetFindMany).not.toHaveBeenCalled();
    expect(db.effetUpdate).not.toHaveBeenCalled();
    expect(db.userFindMany).not.toHaveBeenCalled();
    expect(db.notificationCreateMany).not.toHaveBeenCalled();
    expect(business.relancerAlertesEcartOuvertes).not.toHaveBeenCalled();
    expect(business.refreshTMM).not.toHaveBeenCalled();
    expect(business.sendEmail).not.toHaveBeenCalled();
}

/* ─── (a) Échec fermé : CRON_SECRET absente ─────────────────────────────────── */

describe("cron/* — échec fermé quand CRON_SECRET est absente", () => {
    for (const route of CRON_ROUTES) {
        it(`${route.name} : 401 MÊME avec le bon header, 0 appel DB`, async () => {
            setSecret(undefined);

            await expectRefusal(route.handler, bearerHeader(TEST_SECRET));

            expectNoSideEffect();
        });

        it(`${route.name} : 401 sans aucun header`, async () => {
            setSecret(undefined);

            await expectRefusal(route.handler, {});

            expectNoSideEffect();
        });
    }
});

/* ─── (b) Échec fermé : variable posée, header invalide ─────────────────────── */

describe("cron/* — échec fermé avec CRON_SECRET posée mais header invalide", () => {
    const badHeaders: Record<string, Record<string, string>> = {
        "header absent": {},
        "mauvais secret": bearerHeader(`${TEST_SECRET}-invalide`),
        "secret brut sans schéma Bearer": { authorization: TEST_SECRET },
        "autre schéma d'authentification": { authorization: `Basic ${TEST_SECRET}` },
        "Bearer sans valeur": { authorization: "Bearer " },
    };

    for (const route of CRON_ROUTES) {
        for (const [label, headers] of Object.entries(badHeaders)) {
            it(`${route.name} : 401 — ${label}`, async () => {
                await expectRefusal(route.handler, headers);

                expectNoSideEffect();
            });
        }
    }
});

/* ─── (c) Passage : variable posée + bon header ─────────────────────────────── */

describe("cron/* — passage avec CRON_SECRET + bon header (métier inchangé)", () => {
    it("cron/check-echeances : 200 { alerts, total } après la lecture DB", async () => {
        const response = await cronCheckEcheances(cronRequest(bearerHeader(TEST_SECRET)));

        expect(response.status).toBe(200);
        const body: { alerts: unknown[]; total: number } = await response.json();
        expect(body).toEqual({ alerts: [], total: 0 });
        expect(db.effetFindMany).toHaveBeenCalledTimes(1);
        // Le bon header n'appelle QUE la route concernée.
        expect(business.relancerAlertesEcartOuvertes).not.toHaveBeenCalled();
        expect(business.refreshTMM).not.toHaveBeenCalled();
    });

    it("cron/check-echeances/relance-ecart-bc : 200 { relances } (délai par défaut 48 h)", async () => {
        const response = await cronRelanceEcartBc(cronRequest(bearerHeader(TEST_SECRET)));

        expect(response.status).toBe(200);
        const body: { relances: number } = await response.json();
        expect(body).toEqual({ relances: 0 });
        expect(business.relancerAlertesEcartOuvertes).toHaveBeenCalledTimes(1);
        expect(business.relancerAlertesEcartOuvertes).toHaveBeenCalledWith(48);
        expect(db.effetFindMany).not.toHaveBeenCalled();
    });

    it("cron/tmm-bct : 200 { success, tmm, date } après refreshTMM()", async () => {
        const response = await cronTmmBct(cronRequest(bearerHeader(TEST_SECRET)));

        expect(response.status).toBe(200);
        const body: { success: boolean; tmm: string; date: string } = await response.json();
        expect(body).toEqual({
            success: true,
            tmm: "8,25",
            date: "2026-10-23T00:00:00.000Z",
        });
        expect(business.refreshTMM).toHaveBeenCalledTimes(1);
        expect(db.effetFindMany).not.toHaveBeenCalled();
        expect(business.relancerAlertesEcartOuvertes).not.toHaveBeenCalled();
    });
});

/* ─── (d) Non-fuite : réponse identique, détail en log serveur ──────────────── */

describe("cron/* — non-fuite du secret", () => {
    it("corps de refus BYTE-IDENTIQUE quelle que soit la cause", async () => {
        setSecret(undefined);
        const withoutSecret = await cronTmmBct(cronRequest(bearerHeader(TEST_SECRET)));
        const rawWithoutSecret = await withoutSecret.text();

        setSecret(TEST_SECRET);
        const withBadHeader = await cronTmmBct(cronRequest({ authorization: "Bearer invalide" }));
        const rawWithBadHeader = await withBadHeader.text();

        expect(rawWithoutSecret).toBe(rawWithBadHeader);
        expect(withoutSecret.status).toBe(401);
        expect(withBadHeader.status).toBe(401);
    });

    it("les deux causes ne sont distinguées qu'en log serveur, sans valeur du secret", async () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        setSecret(undefined);
        await cronTmmBct(cronRequest(bearerHeader(TEST_SECRET)));

        setSecret(TEST_SECRET);
        await cronTmmBct(cronRequest({ authorization: "Bearer invalide" }));

        expect(warnSpy).toHaveBeenCalledTimes(2);
        const logged = warnSpy.mock.calls
            .map((call: unknown[]) => call.map((part: unknown) => String(part)).join(" "))
            .join("\n");
        expect(logged).toContain("secret-non-configuré");
        expect(logged).toContain("header-autorisation-invalide");
        expect(logged).not.toContain(TEST_SECRET);
        expectNoSideEffect();
    });
});
