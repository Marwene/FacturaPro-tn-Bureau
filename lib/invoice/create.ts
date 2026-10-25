import { invoiceSchema } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { assertClientNonBloque } from "@/lib/check-client-blocage";
import { serializeDecimals } from "@/lib/decimal";
import { ServiceError } from "@/lib/service-error";
import { nextNumber } from "@/lib/sequence";
import Big from "big.js";

/**
 * Création d'une facture — service partagé (lot H) entre `POST /api/invoices`
 * et `validateBonCommande` (`app/actions/bons-commande.ts`).
 *
 * Le corps de succès est `{ invoice }` (la route répond **201**, la server
 * action renvoie le corps seul) : identique de part et d'autre.
 * `assertClientNonBloque` lève une `Error` non contrôlée → la route garde son
 * 500 `Erreur serveur` (wrapper `apiRoute`), l'action son message historique.
 */
export async function createInvoice(
    rawBody: unknown,
    companyId: string
): Promise<Record<string, unknown>> {
    const parsed = invoiceSchema.safeParse(rawBody);
    if (!parsed.success) {
        throw ServiceError.response(400, "Données invalides", parsed.error.issues);
    }

    const data = parsed.data;

    await assertClientNonBloque(data.tiersId);

    const tiers = await prisma.tiers.findUnique({
        where: { id: data.tiersId },
    });

    if (!tiers) {
        throw ServiceError.response(404, "Client introuvable");
    }

    // Generate invoice number from company prefix
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    // Corps littéral (sans `success: false`) : conservé à l'identique.
    if (!company) throw new ServiceError(400, { error: "Société introuvable" });
    const prefix = company?.prefixeFacture ?? "FAC";
    const numero = await nextNumber("invoice", prefix, companyId);

    let baseHT = new Big(0);
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

        baseHT = baseHT.plus(lineHT);
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

    const totalRetenue = totalHT
        .times(new Big(tiers.tauxRetenue.toString()).div(100));
    const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);

    const computedMontantTND = data.bcViseActif && parseFloat(totalTTC.toFixed(3)) > 0
        ? (data.tauxChange && data.devise !== "TND"
            ? parseFloat(totalTTC.times(new Big(data.tauxChange)).toFixed(3))
            : parseFloat(totalTTC.toFixed(3)))
        : null;

    const invoice = await prisma.invoice.create({
        data: {
            numero,
            tiersId: data.tiersId,
            companyId,
            dateEmission: new Date(data.dateEmission),
            dateEcheance: data.dateEcheance ? new Date(data.dateEcheance) : null,
            baseHT: baseHT.toFixed(4),
            totalHT: totalHT.toFixed(4),
            totalTVA: totalTVA.toFixed(4),
            totalFodec: totalFodec.toFixed(4),
            totalRetenue: totalRetenue.toFixed(4),
            totalTTC: totalTTC.toFixed(4),
            montantPaye: "0",
            resteAPayer: totalTTC.toFixed(4),
            status: "BROUILLON",
            notes: data.notes ?? null,
            bcViseActif: data.bcViseActif ?? false,
            bcViseNumero: data.bcViseNumero ?? null,
            dateSN: data.dateSN ? new Date(data.dateSN) : null,
            poids: data.poids?.toFixed(2) ?? null,
            poidsBrut: data.poidsBrut?.toFixed(2) ?? null,
            nbColis: data.nbColis ?? null,
            devise: data.bcViseActif ? (data.devise ?? "TND") : "TND",
            tauxChange: data.tauxChange ?? null,
            montantTND: computedMontantTND,
            lines: {
                create: lines,
            },
        },
        include: {
            tiers: true,
            lines: { include: { product: true } },
        },
    });

    return { invoice: serializeDecimals(invoice) };
}
