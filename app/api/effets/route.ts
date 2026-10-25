import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { effetSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { nextNumber } from "@/lib/sequence";
import Big from "big.js";
import type { EffetStatus, EffetType } from "@/lib/types";
import { enregistrerMouvement, typeComptePour } from "@/lib/tresorerie/ledger";
import { resolveSens } from "@/lib/tresorerie/sens";
import { cleSourceEffet } from "@/lib/tresorerie/source-keys";

const effetInclude = {
    tireur: { select: { id: true, raisonSociale: true, ville: true, adresse: true, banque: true, ribBancaire: true } },
    fournisseur: { select: { id: true, raisonSociale: true, ville: true, adresse: true, banque: true, ribBancaire: true } },
    companyBank: true,
    achatsLies: true,
};

export const GET = apiRoute.get(
    { permission: "effets:voir", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") ?? "";
        const status = searchParams.get("status") as EffetStatus | null;
        const type = searchParams.get("type") as EffetType | null;

        const where = {
            AND: [
                { companyId },
                status ? { status } : {},
                type ? { type } : {},
                search ? { OR: [
                    { numero: { contains: search, mode: "insensitive" } },
                    { tire: { contains: search, mode: "insensitive" } },
                    { beneficiaire: { contains: search, mode: "insensitive" } },
                ]} : {},
            ] as Record<string, unknown>[],
        };

        const effets = await prisma.effet.findMany({
            where,
            include: effetInclude,
            orderBy: { createdAt: "desc" },
        });

        const stats = {
            totalMontant: effets.reduce((acc, e) => acc.plus(new Big(e.montant.toString())), new Big(0)).toFixed(3),
            enPortefeuille: effets.filter((e) => e.status === "EN_PORTEFEUILLE").length,
            remisEscompte: effets.filter((e) => e.status === "REMIS_ESCOMPTE").length,
            endosse: effets.filter((e) => e.status === "ENDOSSE").length,
            impaye: effets.filter((e) => e.status === "IMPAYE").length,
            paye: effets.filter((e) => e.status === "PAYE").length,
            total: effets.length,
        };

        return { effets: serializeDecimals(effets), stats };
    }
);

export const POST = apiRoute.post(
    { permission: "effets:creer", requireCompany: true },
    async (request, { params, session, companyId }) => {
        const body = await request.json();
        const parsed = effetSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }
        const data = parsed.data;

        const numero = await nextNumber("effet", "EFF", companyId);

        const effet = await prisma.$transaction(async (tx) => {
            const cree = await tx.effet.create({
                data: {
                    numero,
                    type: data.type,
                    invoiceId: data.invoiceId ?? null,
                    montant: data.montant.toString(),
                    tire: data.tire,
                    tireAdresse: data.tireAdresse ?? null,
                    tireBanque: data.tireBanque ?? null,
                    beneficiaire: data.beneficiaire,
                    tireurId: data.tireurId ?? null,
                    fournisseurId: data.fournisseurId ?? null,
                    companyBankAccountId: data.companyBankAccountId ?? null,
                    dateCreation: new Date(data.dateCreation),
                    dateEcheance: new Date(data.dateEcheance),
                    companyId,
                    notes: data.notes ?? null,
                    ordrePaiementNumero: data.ordrePaiementNumero ?? null,
                    achatsLies: data.achatsLies && data.achatsLies.length > 0 ? {
                        createMany: { data: data.achatsLies.map(a => ({ achatId: a.achatId, montantAlloue: a.montantAlloue.toString() })) },
                    } : undefined,
                },
                include: effetInclude,
            });

            // Effet reçu (encaissement attendu) ou émis (décaissement attendu) :
            // écriture PREVU au sens de l'instrument, retirée/contre-passée par
            // les transitions de statut (PAYE / REMIS_ESCOMPTE / ANNULE).
            const resolution = resolveSens({
                chequeType: null,
                effetType: data.type,
                invoiceId: data.invoiceId ?? null,
                achatId: null,
                avoirId: null,
            });
            await enregistrerMouvement(tx, {
                companyId,
                compteType: typeComptePour(resolution.sens, "EFFET"),
                sens: resolution.sens,
                mode: "EFFET",
                statut: "PREVU",
                montant: data.montant.toString(),
                dateOperation: new Date(data.dateCreation),
                dateEcheance: new Date(data.dateEcheance),
                cleSource: cleSourceEffet(cree.id),
                tiersId: data.tireurId ?? data.fournisseurId ?? null,
                invoiceId: data.invoiceId ?? null,
                effetId: cree.id,
                libelle: `Effet ${data.type === "RECU" ? "reçu" : "émis"} ${numero}`,
                reference: numero,
            });

            return cree;
        });

        return NextResponse.json({ effet: serializeDecimals(effet) }, { status: 201 });
    }
);
