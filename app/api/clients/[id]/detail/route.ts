import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { checkClientBlocage } from "@/lib/check-client-blocage";
import Big from "big.js";

export const GET = apiRoute.get(
    { permission: "clients:voir" },
    async (request, { params }) => {
        const { id } = params;

        const client = await prisma.tiers.findUnique({
            where: { id },
        });

        if (!client) {
            return NextResponse.json(errorResponse("Client introuvable"), { status: 404 });
        }

        const [invoiceAgg, paymentAgg, avoirAgg, quoteCount, bcCount, blCount] = await Promise.all([
            prisma.invoice.aggregate({
                where: { tiersId: id, status: { notIn: ["BROUILLON", "ANNULEE"] } },
                _sum: { totalTTC: true, resteAPayer: true, montantPaye: true },
                _count: true,
            }),
            prisma.payment.aggregate({
                where: { tiersId: id },
                _sum: { montant: true },
            }),
            prisma.avoir.aggregate({
                where: { tiersId: id, status: { notIn: ["BROUILLON", "ANNULE"] } },
                _sum: { totalTTC: true },
                _count: true,
            }),
            prisma.quote.count({ where: { tiersId: id } }),
            prisma.bonCommande.count({ where: { tiersId: id } }),
            prisma.bonLivraison.count({ where: { tiersId: id } }),
        ]);

        const totalCA = invoiceAgg._sum.totalTTC?.toString() ?? "0";
        const totalPaye = paymentAgg._sum.montant?.toString() ?? "0";
        const totalImpaye = invoiceAgg._sum.resteAPayer?.toString() ?? "0";
        const totalAvoirs = avoirAgg._sum.totalTTC?.toString() ?? "0";

        const blocage = await checkClientBlocage(id);

        return {
            client: serializeDecimals(client),
            stats: {
                totalCA,
                totalPaye,
                totalImpaye,
                totalAvoirs,
                nbFactures: invoiceAgg._count,
                nbFacturesImpayees: await prisma.invoice.count({
                    where: { tiersId: id, status: { in: ["ENVOYEE", "PARTIELLE", "EN_RETARD"] } },
                }),
                nbDevis: quoteCount,
                nbBC: bcCount,
                nbBL: blCount,
                nbAvoirs: avoirAgg._count,
            },
            blocage,
        };
    }
);
