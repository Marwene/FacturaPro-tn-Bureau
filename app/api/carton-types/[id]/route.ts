import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { cartonTypeInputSchema } from "@/lib/schemas/carton-type";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute.get(
    { permission: "packing:voir", requireCompany: true },
    async (request, { params, companyId }) => {
        const { id } = params;
        const cartonType = await prisma.cartonType.findFirst({
            where: { id, OR: [{ companyId }, { companyId: null }] },
        });
        if (!cartonType) {
            return NextResponse.json(errorResponse("Type de carton introuvable"), { status: 404 });
        }
        return { cartonType };
    },
);

export const PUT = apiRoute.put(
    { permission: "packing:modifier", requireCompany: true, schema: cartonTypeInputSchema },
    async (_request, { params, companyId, body: data }) => {
        const { id } = params;

        const existing = await prisma.cartonType.findFirst({
            where: { id, OR: [{ companyId }, { companyId: null }] },
        });
        if (!existing) {
            return NextResponse.json(errorResponse("Type de carton introuvable"), { status: 404 });
        }

        const updated = await prisma.cartonType.update({
            where: { id, OR: [{ companyId }, { companyId: null }] },
            data: {
                nom: data.nom,
                capacite: data.capacite,
                longueur: data.longueur ?? existing.longueur,
                largeur: data.largeur ?? existing.largeur,
                hauteur: data.hauteur ?? existing.hauteur,
            },
        });

        return { cartonType: updated };
    },
);

export const DELETE = apiRoute.delete(
    { permission: "packing:supprimer", requireCompany: true },
    async (request, { params, companyId }) => {
        const { id } = params;

        const existing = await prisma.cartonType.findFirst({
            where: { id, OR: [{ companyId }, { companyId: null }] },
        });
        if (!existing) {
            return NextResponse.json(errorResponse("Type de carton introuvable"), { status: 404 });
        }

        await prisma.cartonType.delete({ where: { id } });

        return { success: true };
    },
);