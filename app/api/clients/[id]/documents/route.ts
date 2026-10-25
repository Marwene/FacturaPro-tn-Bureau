import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";

export const GET = apiRoute.get(
    { permission: "clients:voir" },
    async (request, { params }) => {
        const { id } = params;

        const [quotes, bonsCommandes, bonsLivraison, invoices, avoirs] = await Promise.all([
            prisma.quote.findMany({
                where: { tiersId: id },
                select: { id: true, numero: true, dateCreation: true, totalTTC: true, status: true },
                orderBy: { dateCreation: "desc" },
            }),
            prisma.bonCommande.findMany({
                where: { tiersId: id },
                select: { id: true, numero: true, dateCreation: true, totalTTC: true, status: true },
                orderBy: { dateCreation: "desc" },
            }),
            prisma.bonLivraison.findMany({
                where: { tiersId: id },
                select: { id: true, numero: true, dateCreation: true, totalTTC: true, status: true },
                orderBy: { dateCreation: "desc" },
            }),
            prisma.invoice.findMany({
                where: { tiersId: id },
                select: { id: true, numero: true, dateEmission: true, totalTTC: true, status: true },
                orderBy: { dateEmission: "desc" },
            }),
            prisma.avoir.findMany({
                where: { tiersId: id },
                select: { id: true, numero: true, dateEmission: true, totalTTC: true, status: true },
                orderBy: { dateEmission: "desc" },
            }),
        ]);

        return {
            devis: serializeDecimals(quotes),
            bonsCommandes: serializeDecimals(bonsCommandes),
            bonsLivraison: serializeDecimals(bonsLivraison),
            factures: serializeDecimals(invoices),
            avoirs: serializeDecimals(avoirs),
        };
    }
);
