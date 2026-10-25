import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { z } from "zod";

const updateSchema = z.object({
    nom: z.string().min(1, "Nom requis"),
});

export const PUT = apiRoute.put({ permission: "produits:modifier" }, async (request, { params }) => {
    const { id } = params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
    }

    const marque = await prisma.marque.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ marque });
});

export const DELETE = apiRoute.delete({ permission: "produits:supprimer" }, async (_request, { params }) => {
    const { id } = params;

    await prisma.$transaction(async (tx) => {
        await tx.product.updateMany({ where: { marqueId: id }, data: { marqueId: null } });
        await tx.marque.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
});
