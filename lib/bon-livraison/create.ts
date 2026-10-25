import { blSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { assertClientNonBloque } from "@/lib/check-client-blocage";
import { serializeDecimals } from "@/lib/decimal";
import { ServiceError } from "@/lib/service-error";
import { nextNumber } from "@/lib/sequence";
import Big from "big.js";

/**
 * Création d'un bon de livraison — service partagé (lot H) entre
 * `POST /api/bons-livraison` et `validateBonCommande`
 * (`app/actions/bons-commande.ts`).
 *
 * Le corps de succès est `{ deliveryNote }` (la route répond **201**, la server
 * action renvoie le corps seul) : identique de part et d'autre.
 * `assertClientNonBloque` lève une `Error` non contrôlée → la route garde son
 * 500 `Erreur serveur` (wrapper `apiRoute`), l'action son message historique.
 */
export async function createBonLivraison(
    rawBody: unknown,
    companyId: string
): Promise<Record<string, unknown>> {
    const parsed = blSchema.safeParse(rawBody);
    if (!parsed.success) {
        throw ServiceError.response(400, "Données invalides", parsed.error.issues);
    }

    const data = parsed.data;

    await assertClientNonBloque(data.tiersId);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    // Corps littéral (sans `success: false`) : conservé à l'identique.
    if (!company) throw new ServiceError(400, { error: "Société introuvable" });
    const prefix = company?.prefixeBL ?? "BL";
    const numero = await nextNumber("bl", prefix, companyId);

    let totalHT = new Big(0);
    let totalTVA = new Big(0);
    let totalFodec = new Big(0);

    const lines = data.lines.map((line, i) => {
        const qty = new Big(line.quantite);
        const prix = new Big(line.prixHT);
        const remFactor = new Big(1).minus(new Big(line.remise).div(100));
        const lineHT = qty.times(prix).times(remFactor);
        const lineFodec = line.fodec
            ? lineHT.times(new Big(line.tauxFodec).div(100))
            : new Big(0);
        const lineTVA = lineHT.times(new Big(line.tauxTVA).div(100));

        totalHT = totalHT.plus(lineHT);
        totalTVA = totalTVA.plus(lineTVA);
        totalFodec = totalFodec.plus(lineFodec);

        return {
            productId: line.productId ?? null,
            variantId: line.variantId ?? null,
            description: line.description,
            quantite: qty.toFixed(3),
            prixHT: prix.toFixed(4),
            remise: new Big(line.remise).toFixed(2),
            tauxTVA: new Big(line.tauxTVA).toFixed(2),
            fodec: line.fodec,
            tauxFodec: new Big(line.tauxFodec).toFixed(2),
            totalHT: lineHT.toFixed(4),
            ordre: i + 1,
        };
    });

    const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);

    const montantTND = data.montantTND && parseFloat(data.montantTND) > 0
        ? data.montantTND
        : (data.tauxChange && data.devise !== "TND"
            ? parseFloat(totalTTC.times(new Big(data.tauxChange)).toFixed(3))
            : null);

    const deliveryNote = await prisma.bonLivraison.create({
        data: {
            numero,
            tiersId: data.tiersId,
            companyId,
            dateCreation: new Date(data.dateCreation),
            dateLivraison: data.dateLivraison ? new Date(data.dateLivraison) : null,
            baseHT: totalHT.toFixed(4),
            totalHT: totalHT.toFixed(4),
            totalTVA: totalTVA.toFixed(4),
            totalFodec: totalFodec.toFixed(4),
            totalTTC: totalTTC.toFixed(4),
            status: "BROUILLON",
            notes: data.notes ?? null,
            blViseActif: data.blViseActif ?? false,
            snNumero: data.snNumero ?? null,
            dateSN: data.dateSN ? new Date(data.dateSN) : null,
            poidsBrut: data.poidsBrut?.toFixed(2) ?? null,
            poidsNet: data.poidsNet?.toFixed(2) ?? null,
            nbColis: data.nbColis ?? null,
            devise: data.blViseActif ? (data.devise ?? "TND") : "TND",
            tauxChange: data.tauxChange ?? null,
            montantTND,
            lines: { create: lines },
        },
        include: {
            tiers: { select: { raisonSociale: true, ville: true } },
        },
    });

    return { deliveryNote: serializeDecimals(deliveryNote) };
}
