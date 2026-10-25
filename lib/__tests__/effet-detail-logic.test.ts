import { describe, it, expect } from "vitest";
import {
    computeNetEncaisse,
    computeEscompte,
    buildActionPayload,
    applyActionFieldChange,
    prefillTmmActionData,
    type EffetActionDialog,
} from "@/components/effets/effet-detail-logic";

const escompteDialog: EffetActionDialog = {
    action: "REMIS_ESCOMPTE",
    title: "Remettre à l'escompte",
};

describe("computeNetEncaisse", () => {
    it("soustrait taux % et frais au montant", () => {
        expect(computeNetEncaisse("1000", "5", "10")).toBe("940.0000");
    });

    it("plafonne à zéro si le résultat est négatif", () => {
        expect(computeNetEncaisse("100", "50", "100")).toBe("0.0000");
    });

    it("gère taux et frais vides comme zéro", () => {
        expect(computeNetEncaisse("1000", "", "")).toBe("1000.0000");
    });
});

describe("computeEscompte", () => {
    it("calcule le montant × taux / 100 sur 4 décimales", () => {
        expect(computeEscompte("1000", "5")).toBe("50.0000");
        expect(computeEscompte("11500", "3.5")).toBe("402.5000");
    });
});

describe("buildActionPayload", () => {
    it("place le statut et recopie les champs saisis", () => {
        const payload = buildActionPayload(
            { action: "ENDOSSE", title: "Endosser" },
            { endosseA: "Société X" },
            "1000",
        );
        expect(payload).toEqual({ status: "ENDOSSE", endosseA: "Société X" });
    });

    it("calcule les frais pour un escompte avec taux saisi", () => {
        const payload = buildActionPayload(escompteDialog, { tauxEscompte: "5" }, "1000");
        expect(payload.status).toBe("REMIS_ESCOMPTE");
        expect(payload.frais).toBe("50.0000");
    });

    it("ne calcule pas de frais si le taux est vide ou absent", () => {
        const avecTauxVide = buildActionPayload(escompteDialog, { tauxEscompte: "  " }, "1000");
        const sansTaux = buildActionPayload(escompteDialog, {}, "1000");
        expect(avecTauxVide).not.toHaveProperty("frais");
        expect(sansTaux).not.toHaveProperty("frais");
    });

    it("ne calcule pas de frais hors escompte", () => {
        const payload = buildActionPayload(
            { action: "IMPAYE", title: "Marquer impayé" },
            { tauxEscompte: "5" },
            "1000",
        );
        expect(payload).not.toHaveProperty("frais");
    });
});

describe("applyActionFieldChange", () => {
    it("recalcule le net encaissé quand le recompute est actif", () => {
        const next = applyActionFieldChange({ tauxEscompte: "5" }, "frais", "10", true, "1000");
        expect(next.netEncaisse).toBe("940.0000");
        expect(next.tauxEscompte).toBe("5");
    });

    it("ne recalcule pas pour un champ hors taux/frais", () => {
        const next = applyActionFieldChange({ tauxEscompte: "5" }, "endosseA", "Société X", true, "1000");
        expect(next).not.toHaveProperty("netEncaisse");
        expect(next.endosseA).toBe("Société X");
    });

    it("ne recalcule pas hors contexte escompte réçu", () => {
        const next = applyActionFieldChange({ tauxEscompte: "5" }, "frais", "10", false, "1000");
        expect(next).not.toHaveProperty("netEncaisse");
    });
});

describe("prefillTmmActionData", () => {
    it("préremplit TMM + 3 % et recalcule le net", () => {
        const next = prefillTmmActionData({}, "4.5", "1000");
        expect(next.tauxEscompte).toBe("7.50");
        expect(next.netEncaisse).toBe("925.0000");
    });

    it("conserve un taux déjà saisi par l'utilisateur", () => {
        const prev = { tauxEscompte: "9", netEncaisse: "910.0000" };
        expect(prefillTmmActionData(prev, "4.5", "1000")).toEqual(prev);
    });

    it("conserve un taux composé uniquement d'espaces comme non saisi", () => {
        const next = prefillTmmActionData({ tauxEscompte: "   " }, "4.5", "1000");
        expect(next.tauxEscompte).toBe("7.50");
    });
});
