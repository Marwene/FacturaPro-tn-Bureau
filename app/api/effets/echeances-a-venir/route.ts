import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";

const querySchema = z.object({
    referenceDate: z.string().optional(),
    horizon: z.coerce.number().int().refine((v) => [30, 60, 90, 120].includes(v), { message: "Horizon invalide" }).optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const GET = apiRoute.get(
    { permission: "effets:voir", requireCompany: true },
    async (request, { companyId }) => {
        const { searchParams } = new URL(request.url);
        const parsed = querySchema.safeParse({
            referenceDate: searchParams.get("referenceDate") ?? undefined,
            horizon: searchParams.get("horizon") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            pageSize: searchParams.get("pageSize") ?? undefined,
        });
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Paramètres invalides", parsed.error.issues), { status: 400 });
        }
        const { referenceDate, horizon, page, pageSize } = parsed.data;

        const now = new Date();
        const startOfToday = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
        const dateEcheance: Prisma.DateTimeFilter = { gte: startOfToday };
        if (horizon) {
            dateEcheance.lte = new Date(now.getTime() + horizon * 24 * 60 * 60 * 1000);
        }

        const where: Prisma.EffetWhereInput = {
            companyId,
            type: "EMIS",
            status: { notIn: ["PAYE", "ANNULE"] },
            dateEcheance,
        };

        const [effets, total] = await Promise.all([
            prisma.effet.findMany({
                where,
                include: {
                    fournisseur: { select: { raisonSociale: true } },
                },
                orderBy: { dateEcheance: "asc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.effet.count({ where }),
        ]);

        const ref = referenceDate ? new Date(referenceDate) : new Date();

        const echeances = effets.map((e) => {
            const diffRef = Math.round((e.dateEcheance.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
            const diffNow = Math.round((e.dateEcheance.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: e.id,
                numero: e.numero,
                fournisseur: e.fournisseur?.raisonSociale ?? e.tire,
                dateEcheance: e.dateEcheance.toISOString(),
                montant: e.montant.toString(),
                joursDepuisReference: diffRef,
                joursDepuisAujourdhui: diffNow,
            };
        });

        return { echeances, total, page, pageSize };
    },
);
