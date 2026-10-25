import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import type { Prisma } from "@/prisma/generated/prisma/client";

export const GET = apiRoute.get(
    { permission: "produits:voir" },
    async (request) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") ?? "30", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {};

    if (type && ["ENTREE", "SORTIE", "AJUSTEMENT"].includes(type)) {
        where.type = type as "ENTREE" | "SORTIE" | "AJUSTEMENT";
    }

    if (from || to) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (from) dateFilter.gte = new Date(from);
        if (to) dateFilter.lte = new Date(to);
        where.date = dateFilter;
    }

    if (search) {
        where.product = {
            OR: [
                { nom: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
            ],
        };
    }

    const [movements, total, mouvementStats] = await Promise.all([
        prisma.stockMovement.findMany({
            where,
            orderBy: { date: "desc" },
            skip,
            take: limit,
            include: {
                product: { select: { id: true, code: true, nom: true, unite: true, stockActuel: true, stockStatus: true } },
            },
        }),
        prisma.stockMovement.count({ where }),
        prisma.stockMovement.groupBy({
            by: ["type"],
            _count: { id: true },
            _sum: { quantite: true },
        }),
    ]);

    return NextResponse.json({
        mouvements: movements.map((m) => ({
            ...serializeDecimals(m),
            quantite: Number(m.quantite),
            product: m.product
                ? { ...m.product, stockActuel: Number(m.product.stockActuel) }
                : null,
        })),
        stats: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            entreeCount: mouvementStats.find((m) => m.type === "ENTREE")?._count.id ?? 0,
            entreeSum: Number(mouvementStats.find((m) => m.type === "ENTREE")?._sum.quantite ?? 0),
            sortieCount: mouvementStats.find((m) => m.type === "SORTIE")?._count.id ?? 0,
            sortieSum: Number(mouvementStats.find((m) => m.type === "SORTIE")?._sum.quantite ?? 0),
        },
    });
});
