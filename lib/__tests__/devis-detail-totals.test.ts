import { describe, it, expect } from "vitest";
import { computeDevisTotals } from "@/components/devis/devis-detail-totals";
import type { SerializedQuoteLine } from "@/lib/types";

function line(partial: Partial<SerializedQuoteLine>): SerializedQuoteLine {
    return {
        id: "line-1",
        quoteId: "quote-1",
        productId: null,
        description: "Ligne test",
        quantite: "1",
        prixHT: "0",
        remise: "0",
        tauxTVA: "19",
        fodec: false,
        tauxFodec: "1",
        totalHT: "0",
        ordre: 0,
        ...partial,
    };
}

describe("computeDevisTotals — remise (ex-L64-84)", () => {
    it("additionne la base HT avant remise et le montant de remise", () => {
        const t = computeDevisTotals(
            [line({ quantite: "2", prixHT: "100", remise: "10" })],
            { totalTTC: "214.200" },
            "TND"
        );
        expect(t.totalBaseAvantRemise.eq(200)).toBe(true);
        expect(t.totalRemise.eq(20)).toBe(true);
    });

    it("remisePercent = taux unique quand une seule ligne est remisée", () => {
        const t = computeDevisTotals(
            [
                line({ quantite: "1", prixHT: "100", remise: "10" }),
                line({ quantite: "1", prixHT: "50", remise: "0" }),
            ],
            { totalTTC: "140" },
            "TND"
        );
        expect(t.remisePercent).toBe("10");
    });

    it("remisePercent = taux unique même sur plusieurs lignes (remises groupées identiques)", () => {
        const t = computeDevisTotals(
            [
                line({ quantite: "1", prixHT: "100", remise: "10" }),
                line({ quantite: "2", prixHT: "30", remise: "10" }),
            ],
            { totalTTC: "140" },
            "TND"
        );
        expect(t.remisePercent).toBe("10");
    });

    it("remisePercent = moyenne pondérée préfixée « ~ » quand les taux diffèrent", () => {
        const t = computeDevisTotals(
            [
                line({ quantite: "1", prixHT: "100", remise: "10" }),
                line({ quantite: "1", prixHT: "100", remise: "20" }),
            ],
            { totalTTC: "172.300" },
            "TND"
        );
        expect(t.totalRemise.eq(30)).toBe(true);
        expect(t.totalBaseAvantRemise.eq(200)).toBe(true);
        expect(t.remisePercent).toBe("~15.0");
    });

    it("aucune remise → totalRemise à 0 et remisePercent « 0 »", () => {
        const t = computeDevisTotals(
            [line({ quantite: "3", prixHT: "100", remise: "0" })],
            { totalTTC: "357" },
            "TND"
        );
        expect(t.totalRemise.eq(0)).toBe(true);
        expect(t.remisePercent).toBe("0");
    });
});

describe("computeDevisTotals — timbre fiscal (ex-L86-87)", () => {
    it("devise TND → timbre fiscal de 1.000 ajouté au total TTC", () => {
        const t = computeDevisTotals([], { totalTTC: "500" }, "TND");
        expect(t.timbreFiscal.eq("1.000")).toBe(true);
        expect(t.totalTTCWithTimbre.eq("501.000")).toBe(true);
    });

    it("devise non TND → timbre fiscal à 0, total TTC inchangé", () => {
        const t = computeDevisTotals([], { totalTTC: "500" }, "EUR");
        expect(t.timbreFiscal.eq(0)).toBe(true);
        expect(t.totalTTCWithTimbre.eq(500)).toBe(true);
    });
});

describe("computeDevisTotals — TVA (ex-L89-103)", () => {
    it("cumule la TVA ligne par ligne sur le HT net de remise", () => {
        const t = computeDevisTotals(
            [line({ quantite: "2", prixHT: "100", remise: "10", tauxTVA: "19" })],
            { totalTTC: "214.200" },
            "TND"
        );
        expect(t.totalTVA.eq("34.2")).toBe(true);
        expect(t.tauxTVAMoyen).toBe("19.0");
    });

    it("tauxTVAMoyen = moyenne pondérée sur taux et remises mixtes", () => {
        const t = computeDevisTotals(
            [
                line({ quantite: "2", prixHT: "100", remise: "10", tauxTVA: "19" }),
                line({ quantite: "1", prixHT: "50", remise: "0", tauxTVA: "7" }),
            ],
            { totalTTC: "275.400" },
            "TND"
        );
        expect(t.totalTVA.eq("37.7")).toBe(true);
        expect(t.tauxTVAMoyen).toBe("16.4");
    });

    it("garde totalHTForTVA.gt(0) : devis sans ligne → tauxTVAMoyen « 0 », TVA à 0", () => {
        const t = computeDevisTotals([], { totalTTC: "0" }, "TND");
        expect(t.totalTVA.eq(0)).toBe(true);
        expect(t.tauxTVAMoyen).toBe("0");
    });

    it("garde totalHTForTVA.gt(0) : lignes à quantité 0 → tauxTVAMoyen « 0 »", () => {
        const t = computeDevisTotals(
            [line({ quantite: "0", prixHT: "100", remise: "0", tauxTVA: "19" })],
            { totalTTC: "1.000" },
            "TND"
        );
        expect(t.totalTVA.eq(0)).toBe(true);
        expect(t.tauxTVAMoyen).toBe("0");
    });

    it("devis vide → totaux remise/timbre cohérents avec le rendu", () => {
        const t = computeDevisTotals([], { totalTTC: "0" }, "TND");
        expect(t.totalRemise.eq(0)).toBe(true);
        expect(t.remisePercent).toBe("0");
        expect(t.timbreFiscal.eq("1.000")).toBe(true);
        expect(t.totalTTCWithTimbre.eq("1.000")).toBe(true);
    });
});
