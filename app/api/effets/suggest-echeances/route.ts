import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute.get(
    { permission: "effets:voir", requireCompany: true },
    async (request, { companyId }) => {
        const { searchParams } = new URL(request.url);
        const montantParam = searchParams.get("montant");

        const existingDates = await prisma.effet.findMany({
            where: {
                companyId,
                status: { notIn: ["PAYE", "ANNULE"] },
                dateEcheance: { gte: new Date() },
            },
            select: { dateEcheance: true, montant: true },
            orderBy: { dateEcheance: "asc" },
        });

        const dateCount = new Map<string, number>();
        for (const e of existingDates) {
            const key = e.dateEcheance.toISOString().split("T")[0];
            dateCount.set(key, (dateCount.get(key) ?? 0) + 1);
        }

        const suggestions: { date: string; label: string; effetsCeJour: number }[] = [];
        const today = new Date();
        const montant = montantParam ? parseFloat(montantParam) : null;

        for (let i = 1; i <= 90; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const day = d.getDay();
            if (day === 0 || day === 6) continue;

            const key = d.toISOString().split("T")[0];
            const count = dateCount.get(key) ?? 0;

            if (count >= 2) continue;

            const existingMontant = existingDates
                .filter((e) => e.dateEcheance.toISOString().split("T")[0] === key)
                .reduce((sum, e) => sum + parseFloat(e.montant.toString()), 0);

            if (montant && (existingMontant + montant) > 50000) continue;

            const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            suggestions.push({
                date: key,
                label: d.toLocaleDateString("fr-TN", { weekday: "short", day: "numeric", month: "short" }),
                effetsCeJour: count,
            });

            if (suggestions.length >= 5) break;
        }

        return { suggestions };
    },
);
