import { prisma } from "@/lib/prisma";
import Big from "big.js";
import { Prisma, InvoiceStatus, PaymentMethod, PaymentStatus } from "@/prisma/generated/prisma/client";
import { enregistrerMouvementPourPayment } from "@/lib/tresorerie/ledger";

export type PaymentResourceKind = "invoice" | "achat" | "effet";

/**
 * Erreur typée levée quand la facture / l'achat / l'effet ciblé n'existe pas ou
 * n'appartient pas à la société courante (companyId). Les routes API la
 * traduisent en 404 pour ne jamais révéler une ressource d'une autre société.
 */
export class PaymentResourceNotFoundError extends Error {
    readonly resource: PaymentResourceKind;
    readonly resourceId: string;

    constructor(resource: PaymentResourceKind, resourceId: string) {
        super(
            resource === "invoice"
                ? "Facture introuvable"
                : resource === "achat"
                    ? "Achat introuvable"
                    : "Effet introuvable",
        );
        this.name = "PaymentResourceNotFoundError";
        this.resource = resource;
        this.resourceId = resourceId;
    }
}

type Db = Prisma.TransactionClient | typeof prisma;

/** Vérifie (lorsqu'un effet est référencé) qu'il appartient à la société courante. */
async function assertEffetBelongsToCompany(
    db: Db,
    effetId: string | undefined,
    companyId: string,
): Promise<void> {
    if (!effetId) return;
    const effet = await db.effet.findFirst({ where: { id: effetId, companyId } });
    if (!effet) throw new PaymentResourceNotFoundError("effet", effetId);
}

export interface ApplyPaymentToInvoiceParams {
    invoiceId: string;
    tiersId: string;
    montant: string;
    methode: PaymentMethod;
    reference?: string | null;
    dateReglement: Date;
    companyId: string;
    notes?: string | null;
    chequeId?: string;
    effetId?: string;
    status?: PaymentStatus;
}

export async function applyPaymentToInvoice(params: ApplyPaymentToInvoiceParams, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    const invoice = await db.invoice.findFirst({
        where: { id: params.invoiceId, companyId: params.companyId },
    });
    if (!invoice) throw new PaymentResourceNotFoundError("invoice", params.invoiceId);
    await assertEffetBelongsToCompany(db, params.effetId, params.companyId);

    const isPending = params.status === "EN_ATTENTE";

    // Only update montantPaye/resteAPayer if payment is confirmed (not pending virement)
    const montantPaye = new Big(invoice.montantPaye.toString());
    const totalTTC = new Big(invoice.totalTTC.toString());
    const newMontantPaye = isPending ? montantPaye : montantPaye.plus(new Big(params.montant));
    const newReste = totalTTC.minus(newMontantPaye);

    let newStatus: InvoiceStatus;
    if (!isPending && newReste.lte(0)) {
        newStatus = "PAYEE";
    } else if (!isPending && newMontantPaye.gt(0)) {
        newStatus = "PARTIELLE";
    } else {
        newStatus = invoice.status as InvoiceStatus;
    }

    const paymentData = {
        invoiceId: params.invoiceId,
        tiersId: params.tiersId,
        montant: params.montant,
        methode: params.methode,
        status: params.status ?? "CONFIRME",
        reference: params.reference ?? null,
        dateReglement: params.dateReglement,
        notes: params.notes ?? null,
        companyId: params.companyId,
        chequeId: params.chequeId ?? null,
        effetId: params.effetId ?? null,
    };

    if (tx) {
        const payment = await db.payment.create({ data: paymentData });
        await db.invoice.update({
            where: { id: params.invoiceId, companyId: params.companyId },
            data: {
                montantPaye: newMontantPaye.toFixed(4),
                resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : totalTTC.toFixed(4),
                status: newStatus,
            },
        });
        await enregistrerMouvementPourPayment(db, payment);
        return payment;
    }

    // Pas de tx fournie : création du paiement, mise à jour du solde de facture
    // ET écriture du mouvement de trésorerie dans LA MÊME transaction (D2).
    return prisma.$transaction(async (transaction) => {
        const payment = await transaction.payment.create({ data: paymentData });
        await transaction.invoice.update({
            where: { id: params.invoiceId, companyId: params.companyId },
            data: {
                montantPaye: newMontantPaye.toFixed(4),
                resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : totalTTC.toFixed(4),
                status: newStatus,
            },
        });
        await enregistrerMouvementPourPayment(transaction, payment);
        return payment;
    });
}

export async function applyPaymentToAchat(
    achatId: string,
    montant: string,
    opts: { methode: PaymentMethod; dateReglement: Date; reference?: string | null; notes?: string | null; tiersId: string; companyId: string; chequeId?: string; effetId?: string; status?: PaymentStatus },
    tx?: Prisma.TransactionClient,
) {
    const db = tx ?? prisma;
    const achat = await db.achat.findFirst({
        where: { id: achatId, companyId: opts.companyId },
    });
    if (!achat) throw new PaymentResourceNotFoundError("achat", achatId);
    await assertEffetBelongsToCompany(db, opts.effetId, opts.companyId);

    const isPending = opts.status === "EN_ATTENTE";

    const newMontantPaye = isPending
        ? new Big(achat.montantPaye.toString())
        : new Big(achat.montantPaye.toString()).plus(new Big(montant));
    const newReste = new Big(achat.totalTTC.toString()).minus(newMontantPaye);

    const paymentData = {
        invoiceId: null,
        achatId,
        tiersId: opts.tiersId,
        montant,
        methode: opts.methode,
        status: opts.status ?? "CONFIRME",
        reference: opts.reference ?? null,
        dateReglement: opts.dateReglement,
        notes: opts.notes ?? null,
        companyId: opts.companyId,
        chequeId: opts.chequeId ?? null,
        effetId: opts.effetId ?? null,
    };

    if (tx) {
        const payment = await db.payment.create({ data: paymentData });
        await db.achat.update({
            where: { id: achatId, companyId: opts.companyId },
            data: {
                montantPaye: newMontantPaye.toFixed(4),
                resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : "0.0000",
            },
        });
        await enregistrerMouvementPourPayment(db, payment);
        return payment;
    }

    // Pas de tx fournie : création du paiement, mise à jour du solde d'achat
    // ET écriture du mouvement de trésorerie dans LA MÊME transaction (D2).
    return prisma.$transaction(async (transaction) => {
        const payment = await transaction.payment.create({ data: paymentData });
        await transaction.achat.update({
            where: { id: achatId, companyId: opts.companyId },
            data: {
                montantPaye: newMontantPaye.toFixed(4),
                resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : "0.0000",
            },
        });
        await enregistrerMouvementPourPayment(transaction, payment);
        return payment;
    });
}

export async function applyEffetEmisPayment(params: { tiersId: string; montant: string; reference?: string | null; dateReglement: Date; companyId: string; notes?: string | null; effetId?: string; status?: PaymentStatus }, tx?: Prisma.TransactionClient) {
    const db = tx ?? prisma;
    await assertEffetBelongsToCompany(db, params.effetId, params.companyId);

    const creer = async (client: typeof prisma | Prisma.TransactionClient) => {
        const payment = await client.payment.create({
            data: {
                invoiceId: null,
                tiersId: params.tiersId,
                montant: params.montant,
                // Un effet est un EFFET : jamais codé en dur en VIREMENT (D2).
                methode: "EFFET",
                status: params.status ?? "CONFIRME",
                reference: params.reference ?? null,
                dateReglement: params.dateReglement,
                notes: params.notes ?? null,
                companyId: params.companyId,
                effetId: params.effetId ?? null,
            },
        });
        await enregistrerMouvementPourPayment(client, payment);
        return payment;
    };

    if (tx) return creer(tx);
    return prisma.$transaction((transaction) => creer(transaction));
}
