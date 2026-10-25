/**
 * Test du scénario « effet REMIS_ESCOMPTE avec agios » — brief lot D2.
 *
 * Vérifie que la remise en escompte d'un effet écrit BIEN 2 lignes de
 * trésorerie : l'encaissement du NET (la ligne PREVU d'origine devient REALISE
 * pour ce montant, jamais le brut) et le DÉCAISSEMENT des agios/frais, tous
 * deux en mode EFFET, avec les clés `effet:<id>` et `effet:<id>:agios`.
 * Route testée : PATCH /api/effets/[id] (status → REMIS_ESCOMPTE).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import Big from "big.js";

const db = vi.hoisted(() => ({
    effetFindFirst: vi.fn(),
    effetUpdate: vi.fn(),
    compteTresorerieUpsert: vi.fn(),
    mouvementFindUnique: vi.fn(),
    mouvementUpdate: vi.fn(),
    mouvementCreate: vi.fn(),
    userFindUnique: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        effet: { findFirst: db.effetFindFirst, update: db.effetUpdate },
        compteTresorerie: { upsert: db.compteTresorerieUpsert },
        mouvementTresorerie: {
            findUnique: db.mouvementFindUnique,
            update: db.mouvementUpdate,
            create: db.mouvementCreate,
        },
        user: { findUnique: db.userFindUnique },
        $transaction: db.transaction,
    },
}));

import { PATCH as PatchEffet } from "@/app/api/effets/[id]/route";
import { encodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/session-token";
import { clearUserSessionCache } from "@/lib/session-cache";

process.env.AUTH_SECRET = "secret-test-escompte";

const COMPANY_A = "company-a";
const EFFET_ID = "ef1";

/** Requête authentifiée en tant qu'ADMIN de la société A (session réelle signée). */
async function authedRequest(
    url: string,
    init: { method?: string; body?: unknown } = {},
): Promise<NextRequest> {
    const token = await encodeSessionToken(
        {
            emailVerified: null,
            id: "user-a",
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

const withId = (id: string): { params: Promise<Record<string, string>> } => ({
    params: Promise.resolve({ id }),
});

/** Effet RECU de 1000 en portefeuille, sur la société A. */
const effetRow = {
    id: EFFET_ID,
    companyId: COMPANY_A,
    numero: "EFF-001",
    type: "RECU",
    status: "EN_PORTEFEUILLE",
    montant: "1000.000",
    tireurId: "tiers-1",
    fournisseurId: null,
    invoiceId: "inv-1",
    netEncaisse: null,
    achatsLies: [],
};

/** Ligne PREVU du grand livre pour cet effet (clé effet:ef1) : encaissement prévu. */
const prevuRow = {
    id: "mnt-prevu",
    companyId: COMPANY_A,
    compteId: "compte-1",
    sens: "ENCAISSEMENT",
    mode: "EFFET",
    statut: "PREVU",
    montant: "1000.000",
    cleSource: `effet:${EFFET_ID}`,
    annuleParId: null,
};

beforeEach(() => {
    clearUserSessionCache();
    for (const fn of Object.values(db)) fn.mockReset();
    db.userFindUnique.mockResolvedValue({ actif: true, role: "ADMIN", permissions: [] });
    db.effetFindFirst.mockResolvedValue(effetRow);
    db.effetUpdate.mockResolvedValue({ ...effetRow, status: "REMIS_ESCOMPTE", netEncaisse: "950.000" });
    db.compteTresorerieUpsert.mockResolvedValue({ id: "compte-1" });
    db.mouvementFindUnique.mockResolvedValue(prevuRow);
    db.mouvementUpdate.mockImplementation(async (arg: { data: Record<string, unknown> }) => ({
        ...prevuRow,
        ...arg.data,
    }));
    db.mouvementCreate.mockImplementation(async (arg: { data: Record<string, unknown> }) => ({
        id: "mnt-agios",
        ...arg.data,
    }));

    // Client tx (forme Prisma) passé au callback de $transaction.
    const client = {
        effet: { update: db.effetUpdate },
        compteTresorerie: { upsert: db.compteTresorerieUpsert },
        mouvementTresorerie: {
            findUnique: db.mouvementFindUnique,
            update: db.mouvementUpdate,
            create: db.mouvementCreate,
        },
    };
    db.transaction.mockImplementation(async (arg: unknown) => {
        if (typeof arg === "function") {
            return (arg as (tx: typeof client) => Promise<unknown>)(client);
        }
        return undefined;
    });
});

describe("PATCH /api/effets/[id] — remise en escompte (net encaissé + agios décaissés)", () => {
    it("REMIS_ESCOMPTE avec agios écrit 2 lignes (net ENCAISSEMENT + agios DECAISSEMENT), toutes deux en mode EFFET, solde net = 900", async () => {
        const res = await PatchEffet(
            await authedRequest(`http://localhost/api/effets/${EFFET_ID}`, {
                method: "PATCH",
                body: { status: "REMIS_ESCOMPTE", netEncaisse: "950.000", dateRemise: "2026-03-01" },
            }),
            withId(EFFET_ID),
        );
        expect(res.status).toBe(200);

        // Ligne 1 — la ligne PREVU d'origine devient REALISE pour le NET (jamais le brut).
        expect(db.mouvementUpdate).toHaveBeenCalledTimes(1);
        const updateAppel = db.mouvementUpdate.mock.calls[0][0];
        expect(updateAppel.where).toEqual({ id: "mnt-prevu" });
        expect(updateAppel.data.statut).toBe("REALISE");
        expect(updateAppel.data.montant).toBe("950.0000"); // net encaissé
        // le mode n'est pas écrasé → la ligne reste en mode EFFET
        expect(updateAppel.data.mode).toBeUndefined();
        const netLigne = { ...prevuRow, ...updateAppel.data } as Record<string, unknown>;
        expect(netLigne.sens).toBe("ENCAISSEMENT");
        expect(netLigne.mode).toBe("EFFET");
        expect(netLigne.cleSource).toBe(`effet:${EFFET_ID}`);

        // Ligne 2 — les AGIOS sont un DÉCAISSEMENT, en mode EFFET.
        expect(db.mouvementCreate).toHaveBeenCalledTimes(1);
        const createData = db.mouvementCreate.mock.calls[0][0].data as Record<string, unknown>;
        expect(createData.sens).toBe("DECAISSEMENT");
        expect(createData.mode).toBe("EFFET");
        expect(createData.statut).toBe("REALISE");
        expect(createData.montant).toBe("50.0000"); // agios = brut 1000 − net 950
        expect(createData.cleSource).toBe(`effet:${EFFET_ID}:agios`);

        // Solde net = encaissé NET − agios = 950 − 50 = 900.
        const soldeNet = new Big(String(netLigne.montant)).minus(new Big(String(createData.montant)));
        expect(soldeNet.toFixed(3)).toBe("900.000");
    });
});
