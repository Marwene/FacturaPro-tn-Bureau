import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/prisma/generated/prisma/client";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";

const querySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    excludeId: z.string().optional(),
});

export const GET = apiRoute.get(
    { permission: "effets:voir", requireCompany: true },
    async (request, { companyId }) => {
        const { searchParams } = new URL(request.url);
        const parsed = querySchema.safeParse({
            date: searchParams.get("date") ?? undefined,
            excludeId: searchParams.get("excludeId") ?? undefined,
        });
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Paramètres invalides", parsed.error.issues), { status: 400 });
        }
        const { date, excludeId } = parsed.data;

        const start = new Date(date + "T00:00:00.000Z");
        const end = new Date(start.getTime() + 86_400_000);

        const where: Prisma.EffetWhereInput = {
            companyId,
            type: "EMIS",
            status: { notIn: ["PAYE", "ANNULE"] },
            dateEcheance: { gte: start, lt: end },
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
        };

        const [collisions, total] = await Promise.all([
            prisma.effet.findMany({
                where,
                select: { id: true, numero: true, dateEcheance: true },
                orderBy: { dateEcheance: "asc" },
            }),
            prisma.effet.count({ where }),
        ]);

        return {
            collisions: collisions.map((c) => ({ id: c.id, numero: c.numero, dateEcheance: c.dateEcheance.toISOString() })),
            total,
        };
    },
);
