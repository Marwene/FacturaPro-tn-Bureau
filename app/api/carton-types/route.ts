import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { cartonTypeInputSchema } from "@/lib/schemas/carton-type";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute.get(
    { permission: "packing:voir", requireCompany: true },
    async (request, { companyId }) => {
        const types = await prisma.cartonType.findMany({
            where: { OR: [{ companyId }, { companyId: null }] },
            orderBy: { nom: "asc" },
        });
        return { cartonTypes: types };
    },
);

export const POST = apiRoute.post(
    { permission: "packing:creer", requireCompany: true, schema: cartonTypeInputSchema },
    async (_request, { companyId, body: data }) => {
        // Vérifier si un type avec ce nom existe déjà pour cette compagnie
        const existing = await prisma.cartonType.findFirst({
            where: { nom: data.nom, companyId },
        });

        if (existing) {
            return NextResponse.json(
                errorResponse("Ce type de carton existe déjà pour cette entreprise"),
                { status: 409 }
            );
        }

        const cartonType = await prisma.cartonType.create({
            data: {
                nom: data.nom,
                capacite: data.capacite,
                companyId,
                longueur: data.longueur ?? null,
                largeur: data.largeur ?? null,
                hauteur: data.hauteur ?? null,
            },
        });

        return { cartonType };
    },
);

export const DELETE = apiRoute.delete(
    { permission: "packing:supprimer", requireCompany: true },
    async (request, { params }) => {
        const { id } = params;

        await prisma.cartonType.delete({ where: { id } });

        return { success: true };
    },
);