import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";

export const GET = apiRoute.get(
    { permission: "fournisseurs:voir", requireCompany: true },
    async (_request, { params, companyId }) => {
        const { id } = params;

        const [achats, avoirs] = await Promise.all([
            prisma.achat.findMany({
                where: { tiersId: id, companyId },
                select: { id: true, numero: true, dateFacture: true, totalTTC: true, status: true },
                orderBy: { dateFacture: "desc" },
            }),
            prisma.avoir.findMany({
                where: { tiersId: id, companyId },
                select: { id: true, numero: true, dateEmission: true, totalTTC: true, status: true, motif: true },
                orderBy: { dateEmission: "desc" },
            }),
        ]);

        return {
            achats: serializeDecimals(achats),
            avoirs: serializeDecimals(avoirs),
        };
    }
);
