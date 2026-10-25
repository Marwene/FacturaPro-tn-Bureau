import Big from "big.js";
import { parseTunisianNumber } from "@/lib/decimal";

interface LineInput {
  quantite: string;
  prixHT?: string;
  prixAchat?: string;
  remise: string;
  tauxTVA: string;
  fodec?: boolean;
  tauxFodec?: string;
}

interface LineTotals {
  ht: Big;
  fodec: Big;
  tva: Big;
  ttc: Big;
}

export function calcLineTotals(
  line: LineInput,
  exonereTVA: boolean = false,
): LineTotals {
  const qty = new Big(parseTunisianNumber(line.quantite) || 0);
  const prixField = line.prixHT ?? line.prixAchat ?? "0";
  const prix = new Big(parseTunisianNumber(prixField) || 0);
  const rem = new Big(parseTunisianNumber(line.remise) || 0);
  const remFactor = new Big(1).minus(rem.div(100));

  const ht = qty.times(prix).times(remFactor);
  const fodec = line.fodec
    ? ht.times(
        new Big(parseTunisianNumber(line.tauxFodec ?? "0") || 0).div(100),
      )
    : new Big(0);
  const tva = exonereTVA
    ? new Big(0)
    : ht.times(new Big(parseTunisianNumber(line.tauxTVA) || 0).div(100));
  const ttc = ht.plus(fodec).plus(tva);

  return { ht, fodec, tva, ttc };
}
