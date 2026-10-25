import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { avoirStatusUpdateSchema } from "@/lib/schemas/document-updates";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { MouvementFinancierType } from "@/prisma/generated/prisma/client";
import { enregistrerMouvement } from "@/lib/tresorerie/ledger";
import { cleSourceMouvementFinancier } from "@/lib/tresorerie/source-keys";

function getMouvementType(tiersId: string | null): "CREDIT" | "DEBIT" {
    return tiersId ? "CREDIT" : "DEBIT";
}

export const GET = apiRoute.get(
    { permission: "avoirs:voir", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const { id } = params;

        const avoir = await prisma.avoir.findFirst({
            where: { id, companyId },
            include: {
                tiers: true,
                invoice: {
                    select: {
                        id: true,
                        numero: true,
                        dateEmission: true,
                        totalTTC: true,
                    },
                },
                lines: {
                    include: { product: true },
                    orderBy: { ordre: "asc" },
                },
                payments: {
                    orderBy: { createdAt: "desc" },
                },
                mouvements: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        if (!avoir) {
            return NextResponse.json(errorResponse("Avoir non trouvé"), { status: 404 });
        }

        return { avoir: serializeDecimals(avoir) };
    }
);

export const PATCH = apiRoute.patch(
    { permission: "avoirs:modifier", requireCompany: true, schema: avoirStatusUpdateSchema },
    async (_request, { params, session, companyId, body }) => {
        const { id } = params;
        const { status } = body;

        const currentAvoir = await prisma.avoir.findFirst({
            where: { id, companyId },
            select: { type: true, status: true, totalTTC: true, tiersId: true, companyId: true, motif: true },
        });

        if (!currentAvoir) {
            return NextResponse.json(errorResponse("Avoir non trouvé"), { status: 404 });
        }

        const resultat = await prisma.$transaction(async (tx) => {
            const avoir = await tx.avoir.update({
                where: { id },
                data: { status },
            });

            if (currentAvoir.type === "FINANCIER" && status === "EMIS") {
                const type = getMouvementType(currentAvoir.tiersId);
                const mouvement = await tx.mouvementFinancier.create({
                    data: {
                        type: type as unknown as MouvementFinancierType,
                        montant: currentAvoir.totalTTC.toString(),
                        avoirId: id,
                        tiersId: currentAvoir.tiersId,
                        companyId: currentAvoir.companyId,
                        notes: currentAvoir.motif ?? "Avoir financier",
                    },
                });

                // Avoir financier = flux non déroutable (règle backfill D1) :
                // sens ET statut A_QUALIFIER, espèces sur la caisse, en attente
                // de qualification par l'utilisateur dans la trésorerie.
                await enregistrerMouvement(tx, {
                    companyId: currentAvoir.companyId,
                    compteType: "CAISSE",
                    sens: "A_QUALIFIER",
                    mode: "ESPECES",
                    statut: "A_QUALIFIER",
                    montant: currentAvoir.totalTTC.toString(),
                    dateOperation: new Date(),
                    cleSource: cleSourceMouvementFinancier(mouvement.id),
                    tiersId: currentAvoir.tiersId,
                    avoirId: id,
                    mouvementFinancierId: mouvement.id,
                    libelle: `Avoir financier ${currentAvoir.motif ?? ""}`.trim(),
                });
            }

            return avoir;
        });

        return { avoir: serializeDecimals(resultat) };
    }
);

export const DELETE = apiRoute.delete(
    { permission: "avoirs:supprimer", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const { id } = params;

        const existing = await prisma.avoir.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!existing) {
            return NextResponse.json(errorResponse("Avoir non trouvé"), { status: 404 });
        }

        await prisma.avoir.delete({ where: { id } });

        return { success: true };
    }
);
