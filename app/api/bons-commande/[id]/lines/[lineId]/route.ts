import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { reconcileBonCommandeLine } from "@/lib/bon-commande/reconciliation";
import Big from "big.js";
import { z } from "zod";

const updateLineSchema = z.object({
    description: z.string().min(1).optional(),
    quantite: z.coerce.number().positive().optional(),
    prixHT: z.coerce.number().min(0).optional(),
    remise: z.coerce.number().min(0).max(100).optional(),
    tauxTVA: z.coerce.number().min(0).optional(),
    fodec: z.boolean().optional(),
    tauxFodec: z.coerce.number().min(0).optional(),
    typeSource: z.enum(["PRODUCTION", "STOCK"]).optional(),
});

// Recalcule et persiste les totaux du BC à partir de l'ensemble de ses lignes.
async function recomputeBonCommandeTotals(bonCommandeId: string) {
    const lignes = await prisma.bonCommandeLine.findMany({ where: { bonCommandeId } });

    let baseHT = new Big(0);
    let totalHT = new Big(0);
    let totalTVA = new Big(0);
    let totalFodec = new Big(0);

    for (const l of lignes) {
        const prix = new Big(l.prixHT.toString());
        const qte = new Big(l.quantite.toString());
        const remise = new Big(l.remise.toString());
        const tauxTVA = new Big(l.tauxTVA.toString());
        const tauxFodec = l.fodec ? new Big(l.tauxFodec.toString()) : new Big(0);

        const remiseMontant = prix.times(remise.div(100));
        const htLigne = prix.minus(remiseMontant).times(qte);
        const tvaLigne = htLigne.times(tauxTVA.div(100));
        const fodecLigne = l.fodec ? htLigne.times(tauxFodec.div(100)) : new Big(0);

        baseHT = baseHT.plus(prix.times(qte));
        totalHT = totalHT.plus(htLigne);
        totalTVA = totalTVA.plus(tvaLigne);
        totalFodec = totalFodec.plus(fodecLigne);
    }

    const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);

    await prisma.bonCommande.update({
        where: { id: bonCommandeId },
        data: {
            baseHT: baseHT.toFixed(4),
            totalHT: totalHT.toFixed(4),
            totalTVA: totalTVA.toFixed(4),
            totalFodec: totalFodec.toFixed(4),
            totalTTC: totalTTC.toFixed(4),
        },
    });
}

export const PATCH = apiRoute.patch(
    { permission: "bonsDeCommande:modifier", requireCompany: true },
    async (request, { params, companyId }) => {
        const { id, lineId } = params;

        const ligne = await prisma.bonCommandeLine.findFirst({
            where: { id: lineId, bonCommandeId: id, bonCommande: { companyId } },
        });
        if (!ligne) return NextResponse.json(errorResponse("Ligne introuvable"), { status: 404 });

        const body = await request.json();
        const parsed = updateLineSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
        }
        const data = parsed.data;

        if (Object.keys(data).length === 0) {
            return NextResponse.json(errorResponse("Aucune modification fournie"), { status: 400 });
        }

        const quantiteChangee = data.quantite !== undefined && Number(ligne.quantite) !== data.quantite;

        // Le prix HT / total HT de la ligne dépendent de quantite, prixHT, remise,
        // tauxTVA, fodec, tauxFodec — on recalcule totalHT de la ligne à partir des
        // valeurs finales (existantes ou modifiées).
        const prix = new Big(data.prixHT ?? ligne.prixHT.toString());
        const qte = new Big(data.quantite ?? ligne.quantite.toString());
        const remise = new Big(data.remise ?? ligne.remise.toString());
        const remiseMontant = prix.times(remise.div(100));
        const htLigne = prix.minus(remiseMontant).times(qte);

        await prisma.bonCommandeLine.update({
            where: { id: lineId },
            data: {
                ...(data.description !== undefined && { description: data.description }),
                ...(data.quantite !== undefined && { quantite: data.quantite }),
                ...(data.prixHT !== undefined && { prixHT: data.prixHT }),
                ...(data.remise !== undefined && { remise: data.remise }),
                ...(data.tauxTVA !== undefined && { tauxTVA: data.tauxTVA }),
                ...(data.fodec !== undefined && { fodec: data.fodec }),
                ...(data.tauxFodec !== undefined && { tauxFodec: data.tauxFodec }),
                ...(data.typeSource !== undefined && { typeSource: data.typeSource }),
                totalHT: htLigne.toFixed(4),
            },
        });

        await recomputeBonCommandeTotals(id);

        // La quantité commandée a changé : le rapprochement (écart vs détail) doit
        // être recalculé — un écart peut apparaître ou disparaître.
        const rapprochement = quantiteChangee ? await reconcileBonCommandeLine(lineId) : null;

        const updated = await prisma.bonCommandeLine.findUnique({
            where: { id: lineId },
            include: { product: { select: { id: true, code: true, nom: true } }, details: true },
        });

        return { ligne: updated, rapprochement };
    }
);
