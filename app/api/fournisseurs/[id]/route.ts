import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";
import { fournisseurSchema } from "@/lib/schemas/fournisseur";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";

export const GET = apiRoute.get(
    { permission: "fournisseurs:voir", requireCompany: true },
    async (_request, { params, companyId: _companyId }) => {
        const { id } = params;
        const fournisseur = await prisma.tiers.findUnique({ where: { id } });
        if (!fournisseur) {
            throw Object.assign(new Error("Fournisseur introuvable"), { status: 404 });
        }

        const [achatAgg, avoirAgg] = await Promise.all([
            prisma.achat.aggregate({
                where: { tiersId: id },
                _sum: { totalTTC: true },
                _count: true,
            }),
            prisma.avoir.aggregate({
                where: { tiersId: id },
                _sum: { totalTTC: true },
                _count: true,
            }),
        ]);

        const stats = {
            totalAchatsTTC: achatAgg._sum.totalTTC ?? 0,
            nbAchats: achatAgg._count,
            totalAvoirsTTC: avoirAgg._sum.totalTTC ?? 0,
            nbAvoirs: avoirAgg._count,
        };

        return { fournisseur: serializeDecimals(fournisseur), stats };
    }
);

export const PUT = apiRoute.put(
    { permission: "fournisseurs:modifier", requireCompany: true },
    async (request, { params, companyId: _companyId }) => {
        const { id } = params;
        const body = await request.json();
        const parsed = fournisseurSchema.safeParse(body);

        if (!parsed.success) {
            throw new Error("Données invalides: " + parsed.error.issues.map((i) => i.message).join(", "));
        }

        try {
            const fournisseur = await prisma.tiers.update({
                where: { id },
                data: parsed.data,
            });

            return { fournisseur: serializeDecimals(fournisseur) };
        } catch (error: unknown) {
            if ((error as { code?: string }).code === "P2002") {
                throw Object.assign(new Error("Code ou matricule fiscal déjà utilisé"), { status: 409 });
            }
            throw error;
        }
    }
);

export const DELETE = apiRoute.delete(
    { permission: "fournisseurs:supprimer", requireCompany: true },
    async (_request, { params, companyId: _companyId }) => {
        const { id } = params;

        const [achatCount, avoirCount, paiementCount, effetCount] = await Promise.all([
            prisma.achat.count({ where: { tiersId: id } }),
            prisma.avoir.count({ where: { tiersId: id } }),
            prisma.mouvementFinancier.count({ where: { tiersId: id } }),
            prisma.effet.count({ where: { fournisseurId: id } }),
        ]);

        if (achatCount > 0 || avoirCount > 0 || paiementCount > 0 || effetCount > 0) {
            const blocks: string[] = [];
            if (achatCount > 0) blocks.push(`${achatCount} facture(s) d'achat`);
            if (avoirCount > 0) blocks.push(`${avoirCount} avoir(s)`);
            if (paiementCount > 0) blocks.push(`${paiementCount} mouvement(s) financier(s)`);
            if (effetCount > 0) blocks.push(`${effetCount} effet(s) de commerce`);
            return NextResponse.json(
                errorResponse(`Impossible de supprimer ce fournisseur : ${blocks.join(", ")}`),
                { status: 409 }
            );
        }

        await prisma.tiers.delete({ where: { id } });
        return { success: true };
    }
);
