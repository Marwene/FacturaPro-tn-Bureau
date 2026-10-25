import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { effetUpdateSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { applyPaymentToInvoice, applyPaymentToAchat, applyEffetEmisPayment, PaymentResourceNotFoundError } from "@/lib/invoice-payment";
import { businessHoursSince, computePayEligibility } from "@/lib/business-hours";
import { VALID_EFFET_TRANSITIONS, isValidEffetTransition } from "@/lib/status-transitions";
import Big from "big.js";
import {
    annulerMouvement,
    enregistrerMouvement,
    retirerMouvementPrevu,
    typeComptePour,
} from "@/lib/tresorerie/ledger";
import { estAnnule } from "@/lib/tresorerie/compute";
import { cleSourceAgios, cleSourceEffet } from "@/lib/tresorerie/source-keys";

const effetInclude = {
    tireur: { select: { id: true, raisonSociale: true, ville: true, adresse: true, banque: true, ribBancaire: true, matriculeFiscal: true } },
    fournisseur: { select: { id: true, raisonSociale: true, ville: true, adresse: true, banque: true, ribBancaire: true } },
    invoice: { select: { id: true, numero: true, totalTTC: true } },
    companyBank: true,
    achatsLies: { include: { achat: { select: { id: true, numero: true, totalTTC: true } } } },
};

export const GET = apiRoute.get(
    { permission: "effets:voir", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const { id } = params;

        const effet = await prisma.effet.findFirst({
            where: { id, companyId },
            include: effetInclude,
        });

        if (!effet) return NextResponse.json(errorResponse("Effet introuvable"), { status: 404 });
        return { effet: serializeDecimals(effet), payEligibility: computePayEligibility(effet.dateCreation) };
    }
);

export const PATCH = apiRoute.patch(
    { permission: "effets:modifier", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const { id } = params;

        const existing = await prisma.effet.findFirst({
            where: { id, companyId },
            include: { achatsLies: true },
        });
        if (!existing) return NextResponse.json(errorResponse("Effet introuvable"), { status: 404 });

        const body = await request.json();
        const parsed = effetUpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }
        const data = parsed.data;

        // Validate status transition
        if (!isValidEffetTransition(existing.status, data.status)) {
            return NextResponse.json(
                errorResponse(
                    `Transition invalide: ${existing.status} → ${data.status}. ` +
                    `Transitions autorisées: ${(VALID_EFFET_TRANSITIONS[existing.status] ?? []).join(", ") || "aucune (état terminal)"}`
                ),
                { status: 400 }
            );
        }

        const updateData: Record<string, unknown> = { status: data.status };

        if (data.status === "REMIS_ESCOMPTE") {
            updateData.tauxEscompte = data.tauxEscompte?.toString() ?? null;
            updateData.frais = data.frais?.toString() ?? null;
            updateData.netEncaisse = data.netEncaisse?.toString() ?? null;
            updateData.dateRemise = data.dateRemise ? new Date(data.dateRemise) : new Date();
        }

        if (data.status === "ENDOSSE") {
            updateData.endosseA = data.endosseA ?? null;
            updateData.endosseLe = data.endosseLe ? new Date(data.endosseLe) : new Date();
        }

        if (data.status === "PAYE") {
            if (existing.status === "PAYE") {
                return NextResponse.json(errorResponse("Cet effet est déjà payé."), { status: 400 });
            }
            const bh = businessHoursSince(existing.dateCreation);
            if (bh < 48) {
                return NextResponse.json(
                    errorResponse(`L'effet doit être en portefeuille au moins 48h ouvrées avant d'être payé (actuellement ${Math.round(bh)}h).`),
                    { status: 400 },
                );
            }
        }

        if (data.status === "IMPAYE") {
            updateData.motifImpaye = data.motifImpaye ?? null;
            updateData.dateImpaye = data.dateImpaye ? new Date(data.dateImpaye) : new Date();
            updateData.fraisProtet = data.fraisProtet?.toString() ?? null;
        }

        let effet;
        if (data.status === "PAYE") {
            try {
                effet = await prisma.$transaction(async (tx) => {
                    let paymentId: string | null = null;
                    
                    if (existing.type === "RECU" && existing.invoiceId) {
                        const invoice = await tx.invoice.findUnique({ where: { id: existing.invoiceId } });
                        if (!invoice) throw new Error("La facture liée à cet effet est introuvable.");
                        const montantPaiement = existing.netEncaisse?.toString() ?? existing.montant.toString();
                        const payment = await applyPaymentToInvoice({ invoiceId: invoice.id, tiersId: invoice.tiersId, montant: montantPaiement, methode: "EFFET", reference: existing.numero, dateReglement: new Date(), companyId, effetId: existing.id, status: "EN_ATTENTE" }, tx);
                        paymentId = payment.id;
                    }
                    if (existing.type === "EMIS") {
                        const tiersId = existing.fournisseurId ?? existing.tireurId;
                        if (!tiersId) throw new Error("Aucun tiers associé à cet effet émis.");
                        if (existing.achatsLies.length > 0) {
                            for (const link of existing.achatsLies) {
                                const payment = await applyPaymentToAchat(link.achatId, link.montantAlloue.toString(), { methode: "EFFET", dateReglement: new Date(), reference: existing.numero, tiersId, companyId, effetId: existing.id, status: "EN_ATTENTE" }, tx);
                                if (!paymentId) paymentId = payment.id;
                            }
                        } else {
                            const payment = await applyEffetEmisPayment({ tiersId, montant: existing.montant.toString(), reference: existing.numero, dateReglement: new Date(), companyId, effetId: existing.id, status: "EN_ATTENTE" }, tx);
                            paymentId = payment.id;
                        }
                    }

                    // Le mouvement PREVU de l'effet est remplacé par celui du
                    // paiement : retrait si PREVU, contre-passation s'il était
                    // déjà REALISE (payé après remise escompte).
                    const mouvementEffet = await tx.mouvementTresorerie.findUnique({
                        where: { cleSource: cleSourceEffet(existing.id) },
                    });
                    if (mouvementEffet !== null && mouvementEffet.companyId === companyId && !estAnnule(mouvementEffet)) {
                        if (mouvementEffet.statut === "REALISE") {
                            await annulerMouvement(tx, {
                                companyId,
                                mouvementId: mouvementEffet.id,
                                motif: "effet payé après remise — encaissement porté par le paiement",
                            });
                        } else {
                            await retirerMouvementPrevu(tx, {
                                companyId,
                                cleSource: cleSourceEffet(existing.id),
                                motif: "effet payé — remplacé par le mouvement du paiement",
                            });
                        }
                    }

                    return tx.effet.update({ where: { id }, data: { ...updateData, paymentId }, include: effetInclude });
                });
            } catch (err) {
                if (err instanceof PaymentResourceNotFoundError) {
                    return NextResponse.json(errorResponse(err.message), { status: 404 });
                }
                const message = err instanceof Error ? err.message : "Erreur lors de l'enregistrement du paiement";
                return NextResponse.json(errorResponse(message), { status: 400 });
            }
        } else if (data.status === "REMIS_ESCOMPTE") {
            effet = await prisma.$transaction(async (tx) => {
                const maj = await tx.effet.update({ where: { id }, data: updateData, include: effetInclude });

                const dateRemise = data.dateRemise ? new Date(data.dateRemise) : new Date();
                const brut = new Big(existing.montant.toString());
                const net = data.netEncaisse != null ? new Big(data.netEncaisse.toString()) : brut;
                const agios = brut.minus(net);

                const mouvement = await tx.mouvementTresorerie.findUnique({
                    where: { cleSource: cleSourceEffet(id) },
                });
                if (mouvement !== null && mouvement.companyId === companyId && mouvement.statut === "PREVU") {
                    // La remise encaisse réellement le NET : l'écriture PREVU
                    // devient REALISE pour ce montant (jamais le brut).
                    await tx.mouvementTresorerie.update({
                        where: { id: mouvement.id },
                        data: {
                            statut: "REALISE",
                            montant: net.toFixed(4),
                            dateOperation: dateRemise,
                            dateValeur: dateRemise,
                        },
                    });
                    if (agios.gt(0)) {
                        await enregistrerMouvement(tx, {
                            companyId,
                            compteType: typeComptePour("DECAISSEMENT", "EFFET"),
                            sens: "DECAISSEMENT",
                            mode: "EFFET",
                            statut: "REALISE",
                            montant: agios,
                            dateOperation: dateRemise,
                            cleSource: cleSourceAgios(cleSourceEffet(id)),
                            tiersId: existing.tireurId ?? existing.fournisseurId ?? null,
                            invoiceId: existing.invoiceId,
                            effetId: existing.id,
                            libelle: `Agios/frais de remise — effet ${existing.numero}`,
                            reference: existing.numero,
                        });
                    }
                }
                return maj;
            });
        } else if (data.status === "ANNULE") {
            effet = await prisma.$transaction(async (tx) => {
                const maj = await tx.effet.update({ where: { id }, data: updateData, include: effetInclude });
                // PREVU → ANNULE sans inverse (règle 3) ; REALISE (post-remise)
                // → contre-passation de l'écriture ET de ses agios.
                const annuleLe = new Date();
                for (const cle of [cleSourceEffet(id), cleSourceAgios(cleSourceEffet(id))]) {
                    const mouvement = await tx.mouvementTresorerie.findUnique({ where: { cleSource: cle } });
                    if (mouvement === null || mouvement.companyId !== companyId || estAnnule(mouvement)) {
                        continue;
                    }
                    await annulerMouvement(tx, {
                        companyId,
                        mouvementId: mouvement.id,
                        annuleLe,
                        motif: "effet annulé",
                    });
                }
                return maj;
            });
        } else {
            effet = await prisma.effet.update({ where: { id }, data: updateData, include: effetInclude });
        }

        return { effet: serializeDecimals(effet) };
    }
);

export const DELETE = apiRoute.delete(
    { permission: "effets:supprimer", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const { id } = params;

        const existing = await prisma.effet.findFirst({
            where: { id, companyId },
        });
        if (!existing) return NextResponse.json(errorResponse("Effet introuvable"), { status: 404 });
        if (existing.status !== "EN_PORTEFEUILLE") {
            return NextResponse.json(errorResponse("Seuls les effets en portefeuille peuvent être supprimés"), { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            // L'effet disparaît : sa ligne PREVU ne doit pas rester orpheline
            // dans le grand livre (retrait, jamais suppression d'écriture).
            await retirerMouvementPrevu(tx, {
                companyId,
                cleSource: cleSourceEffet(id),
                motif: "effet supprimé",
            });
            await tx.effet.delete({ where: { id } });
        });
        return { success: true };
    }
);
