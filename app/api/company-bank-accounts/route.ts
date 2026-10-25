import { NextResponse } from "next/server";
import { companyBankAccountSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute.get(
    // justifié : lecture consommée aussi par le module effets (hooks/use-effets.ts,
    // sélection du compte bancaire) — `parametres:voir` renverrait 403 aux
    // utilisateurs effets sans cette clé → BACKFILL REQUIS (arbitrage Governor) ;
    // multi-société reste garanti par `requireCompany`.
    { authOnly: true, requireCompany: true },
    async (_request, { companyId }) => {
        const accounts = await prisma.companyBankAccount.findMany({
            where: { companyId, actif: true },
            orderBy: [{ isDefault: "desc" }, { nomBanque: "asc" }],
        });
        return { accounts };
    },
);

export const POST = apiRoute.post(
    { permission: "parametres:modifier", requireCompany: true },
    async (request, { companyId }) => {
        const body = await request.json();
        const parsed = companyBankAccountSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }
        const data = parsed.data;
        if (data.isDefault) {
            await prisma.companyBankAccount.updateMany({
                where: { companyId, isDefault: true },
                data: { isDefault: false },
            });
        }
        const account = await prisma.companyBankAccount.create({
            data: { ...data, companyId },
        });
        return NextResponse.json({ account }, { status: 201 });
    },
);
