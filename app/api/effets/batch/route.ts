import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { serializeDecimals } from "@/lib/decimal";

const batchSchema = z.object({
    type: z.enum(["RECU", "EMIS"]),
    effets: z.array(z.object({
        montant: z.coerce.number().positive(),
        tire: z.string().min(1),
        tireAdresse: z.string().optional().nullable(),
        tireBanque: z.string().optional().nullable(),
        beneficiaire: z.string().min(1),
        tireurId: z.string().optional().nullable(),
        fournisseurId: z.string().optional().nullable(),
        companyBankAccountId: z.string().optional().nullable(),
        dateCreation: z.string().min(1),
        dateEcheance: z.string().min(1),
        notes: z.string().optional().nullable(),
        ordrePaiementNumero: z.string().max(50).optional().nullable(),
        achatsLies: z.array(z.object({ achatId: z.string(), montantAlloue: z.coerce.number().positive() })).optional().default([]),
    })),
}).superRefine((data, ctx) => {
    if (data.type === "EMIS") {
        data.effets.forEach((effet, index) => {
            if (!effet.fournisseurId) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["effets", index, "fournisseurId"], message: `Un fournisseur est requis pour l'effet ${index + 1} d'un effet émis.` });
            }
        });
    }
});

export const POST = apiRoute.post(
    { permission: "effets:creer", requireCompany: true },
    async (request, { companyId }) => {
        const body = await request.json();
        const parsed = batchSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }
        const data = parsed.data;

        const isSplit = data.effets.length > 1;
        const splitGroup = isSplit ? `split-${crypto.randomUUID()}` : null;

        const result = await prisma.$transaction(async (tx) => {
            const created = [];
            const year = new Date().getFullYear();
            for (const [index, eff] of data.effets.entries()) {
                const sequence = await tx.sequence.upsert({
                    where: { name_year_companyId: { name: "effet", year, companyId } },
                    update: { lastValue: { increment: 1 } },
                    create: { name: "effet", year, companyId, lastValue: 1 },
                });
                const numero = `EFF-${year}-${String(sequence.lastValue).padStart(4, "0")}`;
                const effet = await tx.effet.create({
                    data: {
                        numero,
                        type: data.type,
                        montant: eff.montant.toString(),
                        tire: eff.tire,
                        tireAdresse: eff.tireAdresse ?? null,
                        tireBanque: eff.tireBanque ?? null,
                        beneficiaire: eff.beneficiaire,
                        tireurId: eff.tireurId ?? null,
                        fournisseurId: eff.fournisseurId ?? null,
                        companyBankAccountId: eff.companyBankAccountId ?? null,
                        dateCreation: new Date(eff.dateCreation),
                        dateEcheance: new Date(eff.dateEcheance),
                        companyId,
                        notes: eff.notes ?? null,
                        ordrePaiementNumero: eff.ordrePaiementNumero ?? null,
                        splitGroup,
                        splitIndex: isSplit ? index + 1 : null,
                        splitTotal: isSplit ? data.effets.length : null,
                        achatsLies: eff.achatsLies.length > 0 ? {
                            createMany: { data: eff.achatsLies.map((a) => ({ achatId: a.achatId, montantAlloue: a.montantAlloue.toString() })) },
                        } : undefined,
                    },
                });
                created.push(effet);
            }
            return created;
        });

        return NextResponse.json({ effets: serializeDecimals(result) }, { status: 201 });
    },
);
