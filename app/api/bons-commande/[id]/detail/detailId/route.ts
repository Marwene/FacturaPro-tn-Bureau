import { NextRequest, NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { reconcileBonCommandeLine } from "@/lib/bon-commande/reconciliation";
import { z } from "zod";

const updateDetailSchema = z.object({
    taille: z.string().optional().nullable(),
    couleur: z.string().optional().nullable(),
    broderie: z.string().optional().nullable(),
    impressionDtf: z.string().optional().nullable(),
    quantite: z.coerce.number().min(0).optional(),
});

export const PATCH = apiRoute.patch(
    { permission: "bonsDeCommande:modifier", requireCompany: true },
    async (request: NextRequest, { params, companyId }) => {
        const { id, detailId } = params;

        const detail = await prisma.bonCommandeLigneDetail.findFirst({
            where: { id: detailId, bonCommandeLine: { bonCommandeId: id, bonCommande: { companyId } } },
            select: { id: true, bonCommandeLineId: true },
        });
        if (!detail) return NextResponse.json(errorResponse("Détail introuvable"), { status: 404 });

        const body = await request.json();
        const parsed = updateDetailSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }
        const data = parsed.data;
        if (Object.keys(data).length === 0) {
            return NextResponse.json(errorResponse("Aucune modification fournie"), { status: 400 });
        }

        await prisma.bonCommandeLigneDetail.update({
            where: { id: detailId },
            data: {
                ...(data.taille !== undefined && { taille: data.taille || null }),
                ...(data.couleur !== undefined && { couleur: data.couleur || null }),
                ...(data.broderie !== undefined && { broderie: data.broderie || null }),
                ...(data.impressionDtf !== undefined && { impressionDtf: data.impressionDtf || null }),
                ...(data.quantite !== undefined && { quantite: data.quantite }),
            },
        });

        const rapprochement = await reconcileBonCommandeLine(detail.bonCommandeLineId);

        return { rapprochement };
    }
);

export const DELETE = apiRoute.delete(
    { permission: "bonsDeCommande:modifier", requireCompany: true },
    async (_request, { params, companyId }) => {
        const { id, detailId } = params;

        const detail = await prisma.bonCommandeLigneDetail.findFirst({
            where: { id: detailId, bonCommandeLine: { bonCommandeId: id, bonCommande: { companyId } } },
            select: { id: true, bonCommandeLineId: true },
        });
        if (!detail) return NextResponse.json(errorResponse("Détail introuvable"), { status: 404 });

        await prisma.bonCommandeLigneDetail.delete({ where: { id: detailId } });
        const rapprochement = await reconcileBonCommandeLine(detail.bonCommandeLineId);

        return { rapprochement };
    }
);
