import { NextRequest, NextResponse } from "next/server";
import { companyBankAccountSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";

export const PATCH = apiRoute.patch(
    { permission: "parametres:modifier", requireCompany: true },
    async (request, { params, companyId }) => {
        const { id } = params;
        const existing = await prisma.companyBankAccount.findFirst({
            where: { id, companyId },
        });
        if (!existing) return NextResponse.json(errorResponse("Compte introuvable"), { status: 404 });
        const body = await request.json();
        const parsed = companyBankAccountSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }
        const data = parsed.data;
        if (data.isDefault) {
            await prisma.companyBankAccount.updateMany({
                where: { companyId: existing.companyId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }
        const account = await prisma.companyBankAccount.update({
            where: { id },
            data,
        });
        return { account };
    },
);

export const DELETE = apiRoute.delete(
    { permission: "parametres:modifier", requireCompany: true },
    async (request, { params, companyId }) => {
        const { id } = params;
        const existing = await prisma.companyBankAccount.findFirst({
            where: { id, companyId },
        });
        if (!existing) return NextResponse.json(errorResponse("Compte introuvable"), { status: 404 });
        await prisma.companyBankAccount.delete({ where: { id } });
        return { success: true };
    },
);
