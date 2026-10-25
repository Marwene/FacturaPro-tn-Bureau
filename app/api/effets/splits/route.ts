import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { serializeDecimals } from "@/lib/decimal";

const effetInclude = {
    tireur: { select: { id: true, raisonSociale: true, ville: true, adresse: true, banque: true, ribBancaire: true } },
    fournisseur: { select: { id: true, raisonSociale: true, ville: true, adresse: true, banque: true, ribBancaire: true } },
    companyBank: true,
};

export const GET = apiRoute.get(
    { permission: "effets:voir", requireCompany: true },
    async (request, { companyId }) => {
        const { searchParams } = new URL(request.url);
        const splitGroup = searchParams.get("splitGroup");
        const effetId = searchParams.get("effetId");

        if (!splitGroup && !effetId) {
            return NextResponse.json(errorResponse("Paramètre splitGroup ou effetId requis"), { status: 400 });
        }

        let group = splitGroup;
        if (!group && effetId) {
            const effet = await prisma.effet.findFirst({ where: { id: effetId, companyId }, select: { splitGroup: true } });
            if (!effet?.splitGroup) return { effets: [] };
            group = effet.splitGroup;
        }

        const effets = await prisma.effet.findMany({
            where: {
                splitGroup: group,
                companyId,
            },
            include: effetInclude,
            orderBy: { splitIndex: "asc" },
        });

        return { effets: serializeDecimals(effets) };
    },
);
