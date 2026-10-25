import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { z } from "zod";

const createSchema = z.object({
    nom: z.string().min(1, "Nom requis"),
    parentId: z.string().optional().nullable(),
});

// Lecture gateée par produits:voir depuis le 2026-09-27 (Option A, cf. docs/wiki/inventaire.md) — était publique avant.
export const GET = apiRoute.get({ permission: "produits:voir" }, async () => {
    const categories = await prisma.categorie.findMany({
        include: { enfants: true, _count: { select: { products: true } } },
        orderBy: { nom: "asc" },
    });
    return { categories: serializeDecimals(categories) };
});

export const POST = apiRoute.post({ permission: "produits:creer" }, async (request) => {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
    }

    const categorie = await prisma.categorie.create({ data: parsed.data });
    return NextResponse.json({ categorie: serializeDecimals(categorie) }, { status: 201 });
});
