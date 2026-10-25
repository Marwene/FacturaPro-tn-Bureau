import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { z } from "zod";

const variantSchema = z.object({
    id: z.string().optional(),
    nom: z.string().min(1, "Nom requis"),
    code: z.string().optional().nullable(),
    attributs: z.any().optional().nullable(),
    prixHT: z.coerce.number().min(0).optional().nullable(),
    stockActuel: z.coerce.number().min(0).default(0),
    stockMinimum: z.coerce.number().min(0).default(0),
    photoUrl: z.string().optional().nullable(),
    actif: z.boolean().default(true),
    ordre: z.number().int().min(0).default(0),
});

const batchVariantsSchema = z.object({
    variants: z.array(variantSchema),
});

export const GET = apiRoute.get(
    { permission: "produits:voir" },
    async (_request, { params }) => {
        const { id } = params;
        const variants = await prisma.productVariant.findMany({
            where: { productId: id },
            orderBy: { ordre: "asc" },
        });

        return NextResponse.json({
            variants: variants.map((v) => ({
                ...serializeDecimals(v),
                attributs: v.attributs as Record<string, string> | null,
            })),
        });
    }
);

export const PUT = apiRoute.put(
    { permission: "produits:modifier" },
    async (request, { params }) => {
        const { id } = params;
        const body = await request.json();
        const parsed = batchVariantsSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }

        const incoming = parsed.data.variants;
        const existing = await prisma.productVariant.findMany({
            where: { productId: id },
            select: { id: true },
        });
        const existingIds = new Set(existing.map((v) => v.id));
        const incomingIds = new Set(incoming.filter((v) => v.id).map((v) => v.id!));

        // Delete removed variants
        const toDelete = [...existingIds].filter((eid) => !incomingIds.has(eid));
        if (toDelete.length > 0) {
            await prisma.productVariant.deleteMany({
                where: { id: { in: toDelete } },
            });
        }

        // Upsert each incoming variant
        for (let i = 0; i < incoming.length; i++) {
            const v = incoming[i];
            const data = {
                nom: v.nom,
                code: v.code ?? null,
                attributs: v.attributs ?? undefined,
                prixHT: v.prixHT != null ? String(v.prixHT) : null,
                stockActuel: String(v.stockActuel),
                stockMinimum: String(v.stockMinimum),
                photoUrl: v.photoUrl ?? null,
                actif: v.actif,
                ordre: i,
            };

            if (v.id && existingIds.has(v.id)) {
                await prisma.productVariant.update({
                    where: { id: v.id },
                    data,
                });
            } else {
                await prisma.productVariant.create({
                    data: { ...data, productId: id },
                });
            }
        }

        // Recalculate product stockStatus
        const updatedVariants = await prisma.productVariant.findMany({
            where: { productId: id },
        });
        const totalStock = updatedVariants.reduce((sum, v) => sum + v.stockActuel.toNumber(), 0);
        const totalMin = updatedVariants.reduce((sum, v) => sum + v.stockMinimum.toNumber(), 0);
        const stockStatus = totalStock <= 0 ? "RUPTURE" as const : totalStock <= totalMin ? "CRITIQUE" as const : "OK" as const;

        await prisma.product.update({
            where: { id },
            data: { stockActuel: totalStock.toString(), stockMinimum: totalMin.toString(), stockStatus },
        });

        const variants = await prisma.productVariant.findMany({
            where: { productId: id },
            orderBy: { ordre: "asc" },
        });

        return NextResponse.json({
            variants: variants.map((v) => ({
                ...serializeDecimals(v),
                attributs: v.attributs as Record<string, string> | null,
            })),
        });
    }
);
