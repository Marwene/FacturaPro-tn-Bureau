import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";

export const GET = apiRoute.get(
    { permission: "fournisseurs:voir", requireCompany: true },
    async (_request, { params, companyId }) => {
        const { id } = params;

        const fournisseur = await prisma.tiers.findUnique({ where: { id } });
        if (!fournisseur) {
            throw Object.assign(new Error("Fournisseur introuvable"), { status: 404 });
        }

        const [achatAgg, avoirAgg, paiementAgg, achatCount] = await Promise.all([
            prisma.achat.aggregate({
                where: { tiersId: id, companyId, status: { notIn: ["BROUILLON", "ANNULEE"] } },
                _sum: { totalTTC: true },
                _count: true,
            }),
            prisma.avoir.aggregate({
                where: { tiersId: id, companyId, status: { notIn: ["BROUILLON", "ANNULE"] } },
                _sum: { totalTTC: true },
                _count: true,
            }),
            prisma.mouvementFinancier.aggregate({
                where: { tiersId: id, companyId, type: "DEBIT" },
                _sum: { montant: true },
            }),
            prisma.achat.count({
                where: {
                    tiersId: id,
                    companyId,
                    status: { notIn: ["BROUILLON", "ANNULEE"] },
                    dateEcheance: { lt: new Date() },
                },
            }),
        ]);

        const totalAchatsTTC = achatAgg._sum.totalTTC?.toString() ?? "0";
        const totalPaye = paiementAgg._sum.montant?.toString() ?? "0";
        const totalImpaye = (parseFloat(totalAchatsTTC) - parseFloat(totalPaye)).toFixed(3);
        const totalAvoirsTTC = avoirAgg._sum.totalTTC?.toString() ?? "0";

        return {
            fournisseur: serializeDecimals(fournisseur),
            stats: {
                totalAchatsTTC,
                totalPaye,
                totalImpaye,
                totalAvoirsTTC,
                nbAchats: achatAgg._count,
                nbAchatsImpayes: achatCount,
                nbAvoirs: avoirAgg._count,
            },
        };
    }
);
