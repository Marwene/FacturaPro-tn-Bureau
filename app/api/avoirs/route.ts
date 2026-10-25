import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { avoirSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { nextNumber } from "@/lib/sequence";
import Big from "big.js";
import { AvoirStatus, AvoirType } from "@/prisma/generated/prisma/client";

export const GET = apiRoute.get(
    { permission: "avoirs:voir", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") ?? "";
        const status = searchParams.get("status") as AvoirStatus | null;
        const type = searchParams.get("type") as AvoirType | null;

        const where = {
            AND: [
                { companyId },
                status ? { status } : {},
                type ? { type } : {},
                search
                    ? {
                        OR: [
                            { numero: { contains: search, mode: "insensitive" as const } },
                            { tiers: { raisonSociale: { contains: search, mode: "insensitive" as const } } },
                        ],
                    }
                    : {},
            ],
        };

        const avoirs = await prisma.avoir.findMany({
            where,
            include: {
                tiers: {
                    select: {
                        id: true,
                        raisonSociale: true,
                        ville: true,
                        matriculeFiscal: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        const totalBig = avoirs.reduce(
            (sum, a) => sum.plus(a.totalTTC.toString()),
            new Big(0)
        );

        const countByStatus = (status: AvoirStatus) =>
            avoirs.filter((a) => a.status === status).length;

        return {
            avoirs: serializeDecimals(avoirs),
            stats: {
                total: totalBig.toFixed(3),
                count: avoirs.length,
                emis: countByStatus("EMIS"),
                rembourse: countByStatus("REMBOURSE"),
                brouillon: countByStatus("BROUILLON"),
            },
        };
    }
);

export const POST = apiRoute.post(
    { permission: "avoirs:creer", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const body = await request.json();
        const parsed = avoirSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.flatten()), { status: 400 });
        }

        const { lines, ...data } = parsed.data;

        const company = await prisma.company.findUnique({ where: { id: companyId } });
        const prefix = company?.prefixeAvoir ?? "AVOIR";
        const numero = await nextNumber("avoir", prefix, companyId);

        let baseHT = new Big(0);
        let totalHT = new Big(0);
        let totalTVA = new Big(0);
        let totalFodec = new Big(0);

        const lineData = lines.map((line, idx) => {
            const qty = new Big(line.quantite);
            const prix = new Big(line.prixHT);
            const remise = new Big(line.remise).div(100);
            const lineTotalHT = qty.times(prix).times(new Big(1).minus(remise));
            const tva = lineTotalHT.times(new Big(line.tauxTVA).div(100));
            const fodec = line.fodec
                ? lineTotalHT.times(new Big(line.tauxFodec).div(100))
                : new Big(0);

            baseHT = baseHT.plus(lineTotalHT);
            totalHT = totalHT.plus(lineTotalHT);
            totalTVA = totalTVA.plus(tva);
            totalFodec = totalFodec.plus(fodec);

            return {
                description: line.description,
                productId: line.productId ?? null,
                quantite: qty.toFixed(3),
                prixHT: prix.toFixed(4),
                remise: new Big(line.remise).toFixed(2),
                tauxTVA: new Big(line.tauxTVA).toFixed(2),
                fodec: line.fodec,
                tauxFodec: new Big(line.tauxFodec).toFixed(2),
                totalHT: lineTotalHT.toFixed(4),
                ordre: idx,
            };
        });

        const totalTTC = baseHT.plus(totalTVA).plus(totalFodec);

        const avoir = await prisma.avoir.create({
            data: {
                numero,
                type: data.type ?? "SIMPLE",
                tiersId: data.tiersId ?? null,
                invoiceId: data.invoiceId ?? null,
                companyId,
                dateEmission: new Date(data.dateEmission),
                motif: data.motif ?? null,
                baseHT: baseHT.toFixed(4),
                totalHT: totalHT.toFixed(4),
                totalTVA: totalTVA.toFixed(4),
                totalFodec: totalFodec.toFixed(4),
                totalTTC: totalTTC.toFixed(4),
                status: "BROUILLON",
                notes: data.notes ?? null,
                lines: { create: lineData },
            },
            include: { tiers: true, lines: true },
        });

        return NextResponse.json({ avoir: serializeDecimals(avoir) }, { status: 201 });
    }
);
