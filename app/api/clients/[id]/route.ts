import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { tiersSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";

export const GET = apiRoute.get(
    { permission: "clients:voir" },
    async (request, { params }) => {
        const { id } = params;

        const [client, invoices, totalCreances] = await Promise.all([
            prisma.tiers.findUnique({ where: { id } }),
            prisma.invoice.findMany({
                where: { tiersId: id },
                orderBy: { createdAt: "desc" },
                include: { lines: false },
            }),
            prisma.invoice.aggregate({
                where: {
                    tiersId: id,
                    status: { notIn: ["BROUILLON", "ANNULEE", "PAYEE"] },
                },
                _sum: { resteAPayer: true },
            }),
        ]);

        if (!client) {
            return NextResponse.json(errorResponse("Client introuvable"), {
                status: 404,
            });
        }

        const solde = totalCreances._sum.resteAPayer?.toString() ?? "0";

        return {
            client: serializeDecimals({ ...client, solde }),
            invoices: serializeDecimals(invoices),
        };
    }
);

export const PATCH = apiRoute.patch(
    { permission: "clients:modifier" },
    async (request, { params }) => {
        try {
            const { id } = params;
            const body = await request.json();
            const parsed = tiersSchema.safeParse(body);

            if (!parsed.success) {
                return NextResponse.json(
                    errorResponse("Données invalides", parsed.error.issues),
                    { status: 400 }
                );
            }

            const client = await prisma.tiers.update({
                where: { id },
                data: {
                    ...parsed.data,
                    tauxRetenue: parsed.data.tauxRetenue.toString(),
                },
            });

            return NextResponse.json({ client: serializeDecimals(client) });
        } catch (error: unknown) {
            if ((error as { code?: string }).code === "P2002") {
                return NextResponse.json(
                    errorResponse("Code ou matricule fiscal déjà utilisé"),
                    { status: 409 }
                );
            }
            console.error("[clients/id/PATCH]", error);
            return NextResponse.json(errorResponse("Erreur serveur"), { status: 500 });
        }
    }
);

export const DELETE = apiRoute.delete(
    { permission: "clients:supprimer" },
    async (request, { params }) => {
        const { id } = params;
        // Check no active invoices
        const count = await prisma.invoice.count({
            where: { tiersId: id, status: { notIn: ["BROUILLON", "ANNULEE"] } },
        });
        if (count > 0) {
            return NextResponse.json(
                errorResponse("Ce client a des factures actives. Impossible de supprimer."),
                { status: 409 }
            );
        }
        await prisma.tiers.delete({ where: { id } });
        return { success: true };
    }
);
