import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Prisma est instancié à l'import de lib/prisma.ts (DATABASE_URL requise) :
// le module est mocké entièrement (vi.mock est hoisté au-dessus des imports).
const db = vi.hoisted(() => ({
    invoiceFindFirst: vi.fn(),
    invoiceUpdate: vi.fn(),
    achatFindFirst: vi.fn(),
    achatUpdate: vi.fn(),
    paymentFindFirst: vi.fn(),
    paymentFindMany: vi.fn(),
    paymentFindUnique: vi.fn(),
    paymentAggregate: vi.fn(),
    paymentCreate: vi.fn(),
    paymentUpdate: vi.fn(),
    effetFindFirst: vi.fn(),
    effetFindUnique: vi.fn(),
    chequeFindUnique: vi.fn(),
    compteTresorerieUpsert: vi.fn(),
    mouvementTresorerieFindUnique: vi.fn(),
    mouvementTresorerieFindFirst: vi.fn(),
    mouvementTresorerieCreate: vi.fn(),
    mouvementTresorerieUpdate: vi.fn(),
    userFindUnique: vi.fn(),
    transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        invoice: { findFirst: db.invoiceFindFirst, update: db.invoiceUpdate },
        achat: { findFirst: db.achatFindFirst, update: db.achatUpdate },
        payment: {
            findFirst: db.paymentFindFirst,
            findMany: db.paymentFindMany,
            findUnique: db.paymentFindUnique,
            aggregate: db.paymentAggregate,
            create: db.paymentCreate,
            update: db.paymentUpdate,
        },
        effet: { findFirst: db.effetFindFirst, findUnique: db.effetFindUnique },
        cheque: { findUnique: db.chequeFindUnique },
        compteTresorerie: { upsert: db.compteTresorerieUpsert },
        mouvementTresorerie: {
            findUnique: db.mouvementTresorerieFindUnique,
            findFirst: db.mouvementTresorerieFindFirst,
            create: db.mouvementTresorerieCreate,
            update: db.mouvementTresorerieUpdate,
        },
        user: { findUnique: db.userFindUnique },
        $transaction: db.transaction,
    },
}));

import { GET as ListPayments, POST as CreatePayment } from "@/app/api/payments/route";
import { PATCH as UpdatePayment, DELETE as RemovePayment } from "@/app/api/payments/[id]/route";
import { GET as GetInvoice } from "@/app/api/invoices/[id]/route";
import {
    applyPaymentToInvoice,
    applyPaymentToAchat,
    applyEffetEmisPayment,
    PaymentResourceNotFoundError,
} from "@/lib/invoice-payment";
import { encodeSessionToken, SESSION_COOKIE_NAME } from "@/lib/session-token";
import { clearUserSessionCache } from "@/lib/session-cache";

process.env.AUTH_SECRET = "secret-test-b2";

const COMPANY_A = "company-a";

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

const noParams = (): { params: Promise<Record<string, string>> } => ({
    params: Promise.resolve({}),
});

const withId = (id: string): { params: Promise<Record<string, string>> } => ({
    params: Promise.resolve({ id }),
});

const invoiceBody = (invoiceId: string, tiersId: string): Record<string, unknown> => ({
    invoiceId,
    tiersId,
    montant: "100.000",
    methode: "ESPECES",
    dateReglement: "2026-10-01",
});

const achatBody = (achatId: string, tiersId: string): Record<string, unknown> => ({
    achatId,
    tiersId,
    montant: "50.000",
    methode: "ESPECES",
    dateReglement: "2026-10-01",
});

/**
 * Ligne `Payment` réaliste renvoyée par le mock de `payment.create` : le
 * ledger D2 (enregistrerMouvementPourPayment) lit montant / companyId / statut
 * pour écrire le mouvement de trésorerie dans la transaction.
 */
const paymentRow = (id: string, invoiceId: string | null): Record<string, unknown> => ({
    id,
    companyId: COMPANY_A,
    montant: "100.000",
    methode: "ESPECES",
    status: "CONFIRME",
    dateReglement: new Date("2026-10-01"),
    tiersId: "client-a",
    invoiceId,
    achatId: null,
    avoirId: null,
    chequeId: null,
    effetId: null,
    reference: null,
});

beforeEach(() => {
    clearUserSessionCache();
    for (const fn of Object.values(db)) fn.mockReset();
    db.userFindUnique.mockResolvedValue({ actif: true, role: "ADMIN", permissions: [] });
    // Le ledger D2 crée/compte résout le compte (CAISSE/BANQUE) puis écrit le
    // mouvement : mocks par défaut neutres (chaque test peut les surcharger).
    db.compteTresorerieUpsert.mockResolvedValue({ id: "compte-caisse-test" });
    db.mouvementTresorerieCreate.mockImplementation(async (arg: { data: Record<string, unknown> }) => ({
        id: `mnt-${db.mouvementTresorerieCreate.mock.calls.length}`,
        ...arg.data,
    }));
    // $transaction accepte les deux formes : tableau (appels historiques) et
    // callback interactif (D2 : écriture du mouvement de trésorerie dans LA
    // MÊME transaction que le paiement). Le callback s'exécute sur le client
    // mocké ci-dessus.
    // Le client passé au callback doit avoir la forme Prisma (tx.payment.create),
    // pas la forme aplatie des mocks (db.paymentCreate).
    const client = {
        invoice: { findFirst: db.invoiceFindFirst, update: db.invoiceUpdate },
        achat: { findFirst: db.achatFindFirst, update: db.achatUpdate },
        payment: {
            findFirst: db.paymentFindFirst,
            findMany: db.paymentFindMany,
            findUnique: db.paymentFindUnique,
            aggregate: db.paymentAggregate,
            create: db.paymentCreate,
            update: db.paymentUpdate,
        },
        effet: { findFirst: db.effetFindFirst, findUnique: db.effetFindUnique },
        cheque: { findUnique: db.chequeFindUnique },
        compteTresorerie: { upsert: db.compteTresorerieUpsert },
        mouvementTresorerie: {
            findUnique: db.mouvementTresorerieFindUnique,
            findFirst: db.mouvementTresorerieFindFirst,
            create: db.mouvementTresorerieCreate,
            update: db.mouvementTresorerieUpdate,
        },
        user: { findUnique: db.userFindUnique },
    };
    db.transaction.mockImplementation(async (arg: unknown) => {
        if (Array.isArray(arg)) {
            return Promise.all(arg as Array<Promise<unknown>>);
        }
        if (typeof arg === "function") {
            return (arg as (tx: typeof client) => Promise<unknown>)(client);
        }
        return undefined;
    });
});

describe("isolation multi-société des paiements — routes API", () => {
    it("GET /api/payments ne retourne que les paiements de la société A", async () => {
        db.paymentFindMany.mockResolvedValue([]);
        db.paymentAggregate.mockResolvedValue({ _sum: { montant: null }, _count: 0 });

        const res = await ListPayments(
            await authedRequest("http://localhost/api/payments?invoiceId=inv-b"),
            noParams(),
        );

        expect(res.status).toBe(200);
        const body: { payments: unknown[] } = await res.json();
        expect(body.payments).toEqual([]);
        expect(db.paymentFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ invoiceId: "inv-b", companyId: COMPANY_A }),
            }),
        );
        expect(db.paymentAggregate).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ companyId: COMPANY_A }),
            }),
        );
    });

    it("GET /api/invoices/[id] renvoie 404 pour une facture de la société B", async () => {
        db.invoiceFindFirst.mockResolvedValue(null);

        const res = await GetInvoice(
            await authedRequest("http://localhost/api/invoices/inv-b"),
            withId("inv-b"),
        );

        expect(res.status).toBe(404);
        expect(db.invoiceFindFirst).toHaveBeenCalledWith({
            where: { id: "inv-b", companyId: COMPANY_A },
            include: expect.anything(),
        });
    });

    it("POST /api/payments renvoie 404 pour payer la facture de la société B", async () => {
        db.invoiceFindFirst.mockResolvedValue(null);

        const res = await CreatePayment(
            await authedRequest("http://localhost/api/payments", {
                method: "POST",
                body: invoiceBody("inv-b", "tiers-b"),
            }),
            noParams(),
        );

        expect(res.status).toBe(404);
        expect(db.invoiceFindFirst).toHaveBeenCalledWith({
            where: { id: "inv-b", companyId: COMPANY_A },
        });
        expect(db.paymentCreate).not.toHaveBeenCalled();
    });

    it("POST /api/payments renvoie 404 pour payer l'achat de la société B", async () => {
        db.achatFindFirst.mockResolvedValue(null);

        const res = await CreatePayment(
            await authedRequest("http://localhost/api/payments", {
                method: "POST",
                body: achatBody("ach-b", "tiers-b"),
            }),
            noParams(),
        );

        expect(res.status).toBe(404);
        expect(db.achatFindFirst).toHaveBeenCalledWith({
            where: { id: "ach-b", companyId: COMPANY_A },
        });
        expect(db.paymentCreate).not.toHaveBeenCalled();
    });

    it("POST /api/payments renvoie 400 si tiersId ne correspond pas au client de la facture", async () => {
        db.invoiceFindFirst.mockResolvedValue({
            id: "inv-a",
            tiersId: "client-a",
            montantPaye: "0",
            totalTTC: "100",
            status: "ENVOYEE",
        });

        const res = await CreatePayment(
            await authedRequest("http://localhost/api/payments", {
                method: "POST",
                body: invoiceBody("inv-a", "autre-tiers"),
            }),
            noParams(),
        );

        expect(res.status).toBe(400);
        const body: { error: string } = await res.json();
        expect(body.error).toContain("client de cette facture");
        expect(db.paymentCreate).not.toHaveBeenCalled();
    });

    it("POST /api/payments renvoie 400 si tiersId ne correspond pas au fournisseur de l'achat", async () => {
        db.achatFindFirst.mockResolvedValue({
            id: "ach-a",
            tiersId: "fournisseur-a",
            montantPaye: "0",
            totalTTC: "50",
        });

        const res = await CreatePayment(
            await authedRequest("http://localhost/api/payments", {
                method: "POST",
                body: achatBody("ach-a", "autre-tiers"),
            }),
            noParams(),
        );

        expect(res.status).toBe(400);
        const body: { error: string } = await res.json();
        expect(body.error).toContain("fournisseur de cet achat");
        expect(db.paymentCreate).not.toHaveBeenCalled();
    });

    it("POST /api/payments crée un paiement quand facture et tiers appartiennent à la société A", async () => {
        db.invoiceFindFirst.mockResolvedValue({
            id: "inv-a",
            tiersId: "client-a",
            montantPaye: "0",
            totalTTC: "100",
            status: "ENVOYEE",
        });
        db.paymentCreate.mockResolvedValue(paymentRow("pay-1", "inv-a"));
        db.invoiceUpdate.mockResolvedValue({ id: "inv-a" });
        db.paymentFindUnique.mockResolvedValue({ id: "pay-1", montant: "100.000" });

        const res = await CreatePayment(
            await authedRequest("http://localhost/api/payments", {
                method: "POST",
                body: invoiceBody("inv-a", "client-a"),
            }),
            noParams(),
        );

        expect(res.status).toBe(201);
        expect(db.invoiceFindFirst).toHaveBeenCalledWith({
            where: { id: "inv-a", companyId: COMPANY_A },
        });
        // Écriture du solde également scopée sur companyId
        expect(db.invoiceUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "inv-a", companyId: COMPANY_A } }),
        );
    });

    it("PATCH /api/payments/[id] (annulation) renvoie 404 pour un paiement de la société B", async () => {
        db.paymentFindFirst.mockResolvedValue(null);

        const res = await UpdatePayment(
            await authedRequest("http://localhost/api/payments/pay-b", {
                method: "PATCH",
                body: { status: "ANNULE" },
            }),
            withId("pay-b"),
        );

        expect(res.status).toBe(404);
        expect(db.paymentFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "pay-b", companyId: COMPANY_A } }),
        );
    });

    it("DELETE /api/payments/[id] renvoie 404 pour un paiement de la société B", async () => {
        db.paymentFindFirst.mockResolvedValue(null);

        const res = await RemovePayment(
            await authedRequest("http://localhost/api/payments/pay-b", { method: "DELETE" }),
            withId("pay-b"),
        );

        expect(res.status).toBe(404);
        expect(db.paymentFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "pay-b", companyId: COMPANY_A } }),
        );
    });
});

describe("lib/invoice-payment — erreurs typées multi-société", () => {
    it("applyPaymentToInvoice lève PaymentResourceNotFoundError si la facture est étrangère", async () => {
        db.invoiceFindFirst.mockResolvedValue(null);

        await expect(
            applyPaymentToInvoice({
                invoiceId: "inv-b",
                tiersId: "tiers-b",
                montant: "100",
                methode: "ESPECES",
                dateReglement: new Date(),
                companyId: COMPANY_A,
            }),
        ).rejects.toThrow(PaymentResourceNotFoundError);

        expect(db.invoiceFindFirst).toHaveBeenCalledWith({
            where: { id: "inv-b", companyId: COMPANY_A },
        });
    });

    it("applyPaymentToAchat lève PaymentResourceNotFoundError si l'achat est étranger", async () => {
        db.achatFindFirst.mockResolvedValue(null);

        await expect(
            applyPaymentToAchat("ach-b", "50", {
                methode: "ESPECES",
                dateReglement: new Date(),
                tiersId: "tiers-b",
                companyId: COMPANY_A,
            }),
        ).rejects.toThrow(PaymentResourceNotFoundError);

        expect(db.achatFindFirst).toHaveBeenCalledWith({
            where: { id: "ach-b", companyId: COMPANY_A },
        });
    });

    it("applyEffetEmisPayment lève PaymentResourceNotFoundError si l'effet est étranger", async () => {
        db.effetFindFirst.mockResolvedValue(null);

        await expect(
            applyEffetEmisPayment({
                tiersId: "tiers-a",
                montant: "100",
                dateReglement: new Date(),
                companyId: COMPANY_A,
                effetId: "effet-b",
            }),
        ).rejects.toThrow(PaymentResourceNotFoundError);

        expect(db.effetFindFirst).toHaveBeenCalledWith({
            where: { id: "effet-b", companyId: COMPANY_A },
        });
        expect(db.paymentCreate).not.toHaveBeenCalled();
    });

    it("applyPaymentToInvoice crée le paiement avec companyId de la société courante", async () => {
        db.invoiceFindFirst.mockResolvedValue({
            id: "inv-a",
            tiersId: "client-a",
            montantPaye: "0",
            totalTTC: "100",
            status: "ENVOYEE",
        });
        db.paymentCreate.mockResolvedValue(paymentRow("pay-2", "inv-a"));
        db.invoiceUpdate.mockResolvedValue({ id: "inv-a" });

        const payment = await applyPaymentToInvoice({
            invoiceId: "inv-a",
            tiersId: "client-a",
            montant: "100",
            methode: "ESPECES",
            dateReglement: new Date(),
            companyId: COMPANY_A,
        });

        expect(payment.id).toBe("pay-2");
        expect(db.paymentCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ companyId: COMPANY_A }),
            }),
        );
        expect(db.invoiceUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "inv-a", companyId: COMPANY_A } }),
        );
    });
});
