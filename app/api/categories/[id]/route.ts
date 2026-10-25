import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { z } from "zod";

const updateSchema = z.object({
    nom: z.string().min(1, "Nom requis").optional(),
    parentId: z.string().optional().nullable(),
});

export const PUT = apiRoute.put({ permission: "produits:modifier" }, async (request, { params }) => {
    const { id } = params;
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
    }

    const categorie = await prisma.categorie.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ categorie: serializeDecimals(categorie) });
});

export const DELETE = apiRoute.delete({ permission: "produits:supprimer" }, async (_request, { params }) => {
    const { id } = params;

    await prisma.product.updateMany({ where: { categorieId: id }, data: { categorieId: null } });
    await prisma.categorie.updateMany({ where: { parentId: id }, data: { parentId: null } });
    await prisma.categorie.delete({ where: { id } });

    return NextResponse.json({ success: true });
});
