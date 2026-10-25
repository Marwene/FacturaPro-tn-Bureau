import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { serializeDecimals } from "@/lib/decimal";

export const GET = apiRoute.get(
    { permission: "effets:voir", requireCompany: true },
    async (request, { companyId }) => {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type") as "invoice" | "achat" | null;
        const entityId = searchParams.get("entityId");

        if (!type) return NextResponse.json(errorResponse("Paramètre type requis (invoice ou achat)"), { status: 400 });

        if (type === "invoice" && entityId) {
            const invoices = await prisma.invoice.findMany({
                where: {
                    tiersId: entityId,
                    companyId,
                    status: { notIn: ["PAYEE", "ANNULEE", "BROUILLON"] },
                    // Exclure toute facture qui a au moins un paiement lié
                    // (chèque, effet, ou paiement direct espèces/virement/carte)
                    AND: [
                        { payments: { none: {} } },
                        { cheques: { none: {} } },
                        { effets: { none: {} } },
                    ],
                },
                select: { id: true, numero: true, totalTTC: true, resteAPayer: true, dateEcheance: true },
                orderBy: { dateEcheance: "asc" },
            });
            return { documents: serializeDecimals(invoices) };
        }

        if (type === "achat" && entityId) {
            const achats = await prisma.achat.findMany({
                where: {
                    tiersId: entityId,
                    companyId,
                    status: { notIn: ["ANNULEE"] },
                    NOT: {
                        effetLiaisons: {
                            some: {
                                effet: { type: "EMIS", status: { notIn: ["ANNULE", "IMPAYE"] } },
                            },
                        },
                    },
                },
                select: { id: true, numero: true, totalTTC: true, dateEcheance: true },
                orderBy: { dateEcheance: "asc" },
            });
            return { documents: serializeDecimals(achats) };
        }

        return { documents: [] };
    },
);
