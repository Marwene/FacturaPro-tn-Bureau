import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";

interface EcheanceItem {
    id: string;
    numero: string | null;
    dateEcheance: Date | null;
    totalTTC: string;
    status: string;
    daysUntilDue: number;
}

export const GET = apiRoute.get(
    { permission: "fournisseurs:voir", requireCompany: true },
    async (_request, { params, companyId }) => {
        const { id } = params;

        const echeances = await prisma.achat.findMany({
            where: {
                tiersId: id,
                companyId,
                dateEcheance: { not: null },
                status: { notIn: ["BROUILLON", "ANNULEE"] },
            },
            select: {
                id: true,
                numero: true,
                dateEcheance: true,
                totalTTC: true,
                status: true,
            },
            orderBy: { dateEcheance: "asc" },
        });

        const now = new Date();
        const overdue: EcheanceItem[] = [];
        const upcoming: EcheanceItem[] = [];
        const later: EcheanceItem[] = [];

        for (const e of echeances) {
            if (!e.dateEcheance) continue;
            const diff = e.dateEcheance.getTime() - now.getTime();
            const daysUntilDue = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (daysUntilDue < 0) {
                overdue.push({ ...e, daysUntilDue } as unknown as EcheanceItem);
            } else if (daysUntilDue <= 7) {
                upcoming.push({ ...e, daysUntilDue } as unknown as EcheanceItem);
            } else {
                later.push({ ...e, daysUntilDue } as unknown as EcheanceItem);
            }
        }

        return {
            overdue: serializeDecimals(overdue),
            upcoming: serializeDecimals(upcoming),
            later: serializeDecimals(later),
            totalOverdue: overdue.reduce((sum, e) => sum + Number(e.totalTTC), 0),
            totalUpcoming: upcoming.reduce((sum, e) => sum + Number(e.totalTTC), 0),
        };
    }
);
