import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { applyPaymentToInvoice, PaymentResourceNotFoundError } from "@/lib/invoice-payment";
import { enregistrerMouvementPourPayment, retirerMouvementPrevu } from "@/lib/tresorerie/ledger";
import { cleSourceCheque } from "@/lib/tresorerie/source-keys";

export const POST = apiRoute.post(
    { permission: "cheques:encaisser", requireCompany: true },
    async (request, { params, companyId }) => {
        const { id } = params;

        const existing = await prisma.cheque.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return NextResponse.json(errorResponse("Chèque introuvable"), { status: 404 });
        }
        if (existing.status === "ENCAISSE") {
            return NextResponse.json(errorResponse("Ce chèque est déjà encaissé."), { status: 400 });
        }
        if (existing.status !== "EN_ATTENTE") {
            return NextResponse.json(errorResponse("Seuls les chèques en attente peuvent être encaissés."), { status: 400 });
        }

        try {
            const result = await prisma.$transaction(async (tx) => {
                let paymentId: string;

                if (existing.invoiceId) {
                    const invoice = await tx.invoice.findUnique({ where: { id: existing.invoiceId } });
                    if (!invoice) {
                        throw new Error("La facture liée à ce chèque est introuvable.");
                    }
                    const payment = await applyPaymentToInvoice(
                        {
                            invoiceId: invoice.id,
                            tiersId: invoice.tiersId,
                            montant: existing.montant.toString(),
                            methode: "CHEQUE",
                            reference: existing.numero,
                            dateReglement: new Date(),
                            companyId,
                            chequeId: existing.id,
                        },
                        tx,
                    );
                    paymentId = payment.id;
                } else {
                    const payment = await tx.payment.create({
                        data: {
                            invoiceId: null,
                            tiersId: existing.tiersId!,
                            montant: existing.montant.toString(),
                            methode: "CHEQUE",
                            reference: existing.numero,
                            dateReglement: new Date(),
                            companyId,
                            chequeId: existing.id,
                        },
                    });
                    await enregistrerMouvementPourPayment(tx, payment);
                    paymentId = payment.id;
                }

                // Le chèque encaissé n'est plus « prévu » : le mouvement devient
                // REALISE au travers du Payment (write ci-dessus), la ligne
                // PREVU d'origine est retirée (jamais supprimée, idempotence D1).
                await retirerMouvementPrevu(tx, {
                    companyId,
                    cleSource: cleSourceCheque(existing.id),
                    motif: "chèque encaissé — remplacé par le mouvement du paiement",
                });

                const cheque = await tx.cheque.update({
                    where: { id },
                    data: { status: "ENCAISSE", paymentId },
                    include: { tiers: { select: { raisonSociale: true, ville: true } } },
                });

                return cheque;
            });

            const isStandalone = !existing.invoiceId;
            const note = isStandalone
                ? "Paiement autonome — ce chèque n'est lié à aucune facture et n'affecte pas de solde de facture."
                : undefined;

            return {
                cheque: serializeDecimals(result),
                ...(note ? { note } : {}),
            };
        } catch (err) {
            if (err instanceof PaymentResourceNotFoundError) {
                return NextResponse.json(errorResponse(err.message), { status: 404 });
            }
            const message = err instanceof Error ? err.message : "Erreur lors de l'encaissement";
            return NextResponse.json(errorResponse(message), { status: 400 });
        }
    }
);
