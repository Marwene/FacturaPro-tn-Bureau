import { describe, it, expect } from "vitest";
import {
    prixAchatAffiche,
    stockNiveaux,
    valeurStockAffiche,
    type ProduitDetailChiffres,
} from "@/components/produits/produit-detail-logic";

function chiffres(overrides: Partial<ProduitDetailChiffres> = {}): ProduitDetailChiffres {
    return {
        prixHT: "10",
        prixAchat: "6",
        prixAchatDefault: null,
        stockActuel: "12",
        stockMinimum: "5",
        ...overrides,
    };
}

describe("prixAchatAffiche", () => {
    it("retourne le prix d'achat du produit sans fournisseur par défaut", () => {
        expect(prixAchatAffiche(chiffres())).toBe("6,000 DT");
    });

    it("privilégie le prix du fournisseur par défaut", () => {
        expect(prixAchatAffiche(chiffres({ prixAchatDefault: 7.5 }))).toBe("7,500 DT");
    });
});

describe("stockNiveaux", () => {
    it("convertit les décimaux sérialisés en nombres", () => {
        expect(stockNiveaux(chiffres({ stockActuel: "12.5", stockMinimum: "3" }))).toEqual({
            stockActuel: 12.5,
            stockMinimum: 3,
        });
    });
});

describe("valeurStockAffiche", () => {
    it("valorise le stock actuel au prix HT", () => {
        expect(valeurStockAffiche(chiffres())).toBe("120,000 DT");
    });
});
