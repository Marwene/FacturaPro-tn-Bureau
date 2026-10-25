import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";
import { retirerMouvementPrevu, synchroniserMouvementPaiement } from "@/lib/tresorerie/ledger";
import { cleSourceCheque } from "@/lib/tresorerie/source-keys";

export const POST = apiRoute.post(
    { permission: "cheques:modifier", requireCompany: true },
    async (request, { params, companyId }) => {
        const { id } = params;

        const existing = await prisma.cheque.findFirst({
            where: { id, companyId },
        });
        if (!existing) {
            return NextResponse.json(errorResponse("Chèque introuvable"), { status: 404 });
        }
        if (existing.status === "REJETE") {
            return NextResponse.json(errorResponse("Ce chèque est déjà rejeté."), { status: 400 });
        }
        if (existing.status !== "EN_ATTENTE") {
            return NextResponse.json(errorResponse("Seuls les chèques en attente peuvent être rejetés."), { status: 400 });
        }

        try {
            const result = await prisma.$transaction(async (tx) => {
                if (existing.paymentId) {
                    const payment = await tx.payment.findUnique({ where: { id: existing.paymentId } });
                    if (payment) {
                        if (payment.invoiceId) {
                            const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
                            if (invoice) {
                                const paymentMontant = new Big(payment.montant.toString());
                                const currentMontantPaye = new Big(invoice.montantPaye.toString());
                                const totalTTC = new Big(invoice.totalTTC.toString());
                                const newMontantPaye = currentMontantPaye.minus(paymentMontant);
                                const newReste = totalTTC.minus(newMontantPaye);

                                let newStatus: "BROUILLON" | "ENVOYEE" | "PARTIELLE" | "PAYEE" | "EN_RETARD" | "ANNULEE";
                                if (newMontantPaye.lte(0)) {
                                    newStatus = "ENVOYEE";
                                } else {
                                    newStatus = "PARTIELLE";
                                }

                                await tx.invoice.update({
                                    where: { id: payment.invoiceId },
                                    data: {
                                        montantPaye: newMontantPaye.toFixed(4),
                                        resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : totalTTC.toFixed(4),
                                        status: newStatus,
                                    },
                                });
                            }
                        } else if (payment.achatId) {
                            const achat = await tx.achat.findUnique({ where: { id: payment.achatId } });
                            if (achat) {
                                const paymentMontant = new Big(payment.montant.toString());
                                const currentMontantPaye = new Big(achat.montantPaye.toString());
                                const totalTTC = new Big(achat.totalTTC.toString());
                                const newMontantPaye = currentMontantPaye.minus(paymentMontant);
                                const newReste = totalTTC.minus(newMontantPaye);

                                await tx.achat.update({
                                    where: { id: payment.achatId },
                                    data: {
                                        montantPaye: newMontantPaye.toFixed(4),
                                        resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : "0.0000",
                                    },
                                });
                            }
                        }

                        // Le paiement est CONSERVÉ (statut ANNULE) : le ledger D2
                        // ne tolère pas la suppression de lignes historiques
                        // (principe déjà appliqué dans `payments/[id]` DELETE).
                        // Son mouvement de trésorerie est annulé dans la même
                        // transaction (contre-passation s'il était REALISE, sinon
                        // passage ANNULE) pour ne pas laisser d'écriture fantôme.
                        await tx.payment.update({
                            where: { id: payment.id },
                            data: { status: "ANNULE" },
                        });

                        await synchroniserMouvementPaiement(tx, {
                            paiement: payment,
                            nouveauStatut: "ANNULE",
                            motif: "paiement annulé (chèque rejeté)",
                        });
                    }
                }

                await retirerMouvementPrevu(tx, {
                    companyId,
                    cleSource: cleSourceCheque(id),
                    motif: "chèque rejeté",
                });

                const cheque = await tx.cheque.update({
                    where: { id },
                    data: { status: "REJETE", paymentId: null },
                    include: { tiers: { select: { raisonSociale: true, ville: true } } },
                });

                return cheque;
            });

            return { cheque: serializeDecimals(result) };
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erreur lors du rejet du chèque";
            return NextResponse.json(errorResponse(message), { status: 400 });
        }
    }
);
