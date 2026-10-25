import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { apiRoute } from "@/lib/api-route";
import { stockMovementCreateSchema } from "@/lib/schemas/document-updates";

export const GET = apiRoute.get(
    { permission: "produits:voir", requireCompany: false },
    async (_request, { params }) => {
        const { id } = params;
        const movements = await prisma.stockMovement.findMany({
            where: { productId: id },
            orderBy: { date: "desc" },
            include: {
                product: {
                    select: { id: true, code: true, nom: true, unite: true },
                },
            },
        });

        const serialized = movements.map((m) => ({
            ...serializeDecimals(m),
            product: m.product
                ? { id: m.product.id, code: m.product.code, nom: m.product.nom, unite: m.product.unite }
                : null,
        }));

        return { movements: serialized };
    }
);

export const POST = apiRoute.post(
    { permission: "produits:modifier", requireCompany: false, schema: stockMovementCreateSchema },
    async (_request, { params, body }) => {
        const { id } = params;
        const { type, quantite, notes, supplierId, purchasePrice } = body;

        // `type` (∈ enum MouvementType) et `quantite` (> 0) sont validés par le
        // Zod du wrapper (422) : les 400 « Type de mouvement invalide » et
        // « Quantité doit être positive » sont retirés. `referenceType` reste
        // figé sur « INVENTAIRE » et n'est pas déclaré → non injectable.
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return NextResponse.json(errorResponse("Produit introuvable"), { status: 404 });
        }

        const incrementValue = type === "SORTIE" ? -quantite : quantite;

        const result = await prisma.$transaction(async (tx) => {
            const movement = await tx.stockMovement.create({
                data: {
                    productId: id,
                    type,
                    quantite: quantite.toString(),
                    referenceType: "INVENTAIRE",
                    notes: notes ?? null,
                    supplierId: supplierId ?? null,
                    purchasePrice: purchasePrice ?? null,
                    date: new Date(),
                },
            });

            await tx.product.update({
                where: { id },
                data: { stockActuel: { increment: incrementValue } },
            });

            const updatedProduct = await tx.product.findUnique({
                where: { id },
                include: {
                    categorie: { select: { id: true, nom: true } },
                    marque: { select: { nom: true } },
                    tiers: { select: { raisonSociale: true } },
                },
            });

            const stockActuel = updatedProduct!.stockActuel.toNumber();
            const stockMinimum = updatedProduct!.stockMinimum.toNumber();
            const stockStatus = stockActuel <= 0
                ? "RUPTURE" as const
                : stockActuel <= stockMinimum
                    ? "CRITIQUE" as const
                    : "OK" as const;

            if (stockStatus !== updatedProduct!.stockStatus) {
                await tx.product.update({
                    where: { id },
                    data: { stockStatus },
                });
            }

            return { movement, stockActuel: updatedProduct!.stockActuel, stockStatus };
        });

        return {
            movement: serializeDecimals(result.movement),
            stockActuel: serializeDecimals(result.stockActuel),
            stockStatus: result.stockStatus,
        };
    }
);
