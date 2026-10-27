import Big from "big.js";
import type { SerializedQuote, SerializedQuoteLine } from "@/lib/types";

export interface DevisTotals {
    totalRemise: Big;
    totalBaseAvantRemise: Big;
    remisePercent: string;
    timbreFiscal: Big;
    totalTTCWithTimbre: Big;
    totalTVA: Big;
    tauxTVAMoyen: string;
}

/**
 * Totaux financiers d'un devis — logique déplacée VERBATIM depuis
 * devis-detail-client.tsx (ex-L64-103), même ordre de calculs,
 * mêmes `new Big(...)`, mêmes `.toFixed()`/arrondis.
 */
export function computeDevisTotals(
    lines: SerializedQuoteLine[],
    quote: Pick<SerializedQuote, "totalTTC">,
    devise: string,
): DevisTotals {
    let totalRemise = new Big(0);
    let totalBaseAvantRemise = new Big(0);
    for (const line of lines) {
        const qty = new Big(line.quantite);
        const prix = new Big(line.prixHT);
        const baseLine = qty.times(prix);
        const rem = new Big(line.remise);
        const remiseAmount = baseLine.times(rem.div(100));
        totalBaseAvantRemise = totalBaseAvantRemise.plus(baseLine);
        totalRemise = totalRemise.plus(remiseAmount);
    }

    const lignesAvecRemise = lines.filter(l => new Big(l.remise).gt(0));
    const tousLesTauxUniques = [...new Set(lignesAvecRemise.map(l => l.remise))];
    const remisePercent = totalRemise.gt(0)
        ? tousLesTauxUniques.length === 1
            ? tousLesTauxUniques[0]
            : totalBaseAvantRemise.gt(0)
                ? `~${totalRemise.div(totalBaseAvantRemise).times(100).toFixed(1)}`
                : "0"
        : "0";

    const timbreFiscal = devise === "TND" ? new Big("1.000") : new Big(0);
    const totalTTCWithTimbre = new Big(quote.totalTTC).plus(timbreFiscal);

    let totalTVA = new Big(0);
    let totalHTForTVA = new Big(0);
    for (const line of lines) {
        const qty = new Big(line.quantite);
        const prix = new Big(line.prixHT);
        const rem = new Big(line.remise);
        const remFactor = new Big(1).minus(rem.div(100));
        const ht = qty.times(prix).times(remFactor);
        const tva = ht.times(new Big(line.tauxTVA).div(100));
        totalTVA = totalTVA.plus(tva);
        totalHTForTVA = totalHTForTVA.plus(ht);
    }
    const tauxTVAMoyen = totalHTForTVA.gt(0)
        ? totalTVA.div(totalHTForTVA).times(100).toFixed(1)
        : "0";
    return {
        totalRemise,
        totalBaseAvantRemise,
        remisePercent,
        timbreFiscal,
        totalTTCWithTimbre,
        totalTVA,
        tauxTVAMoyen,
    };
}
