import { describe, it, expect } from "vitest";
import Big from "big.js";
import { calcLineTotals } from "@/lib/calc-line-totals";

describe("calcLineTotals", () => {
    it("calculates a simple line without discount", () => {
        const { ht, fodec, tva, ttc } = calcLineTotals({
            quantite: "2",
            prixHT: "100",
            remise: "0",
            tauxTVA: "19",
        });
        expect(ht.eq(200)).toBe(true);
        expect(fodec.eq(0)).toBe(true);
        expect(tva.eq(38)).toBe(true);
        expect(ttc.eq(238)).toBe(true);
    });

    it("applies a percentage discount", () => {
        const { ht, tva, ttc } = calcLineTotals({
            quantite: "10",
            prixHT: "100",
            remise: "10",
            tauxTVA: "19",
        });
        expect(ht.eq(900)).toBe(true);
        expect(tva.eq(171)).toBe(true);
        expect(ttc.eq(1071)).toBe(true);
    });

    it("adds FODEC on top of HT when fodec flag is set", () => {
        const { ht, fodec, tva, ttc } = calcLineTotals({
            quantite: "1",
            prixHT: "1000",
            remise: "0",
            tauxTVA: "19",
            fodec: true,
            tauxFodec: "1",
        });
        expect(ht.eq(1000)).toBe(true);
        expect(fodec.eq(10)).toBe(true);
        expect(tva.eq(190)).toBe(true);
        expect(ttc.eq(1200)).toBe(true);
    });

    it("does not add FODEC when fodec flag is absent", () => {
        const { ht, fodec, ttc } = calcLineTotals({
            quantite: "1",
            prixHT: "1000",
            remise: "0",
            tauxTVA: "19",
        });
        expect(ht.eq(1000)).toBe(true);
        expect(fodec.eq(0)).toBe(true);
        expect(ttc.eq(1190)).toBe(true);
    });

    it("does not add FODEC when fodec flag is explicitly false", () => {
        const { fodec } = calcLineTotals({
            quantite: "1",
            prixHT: "1000",
            remise: "0",
            tauxTVA: "19",
            fodec: false,
            tauxFodec: "1",
        });
        expect(fodec.eq(0)).toBe(true);
    });

    it("zeros TVA when exonereTVA=true (FODEC stays driven by the fodec flag only)", () => {
        // Real behavior of the code: exonereTVA clears TVA but does NOT clear
        // FODEC — FODEC is controlled solely by `line.fodec`. Documented here
        // so any future change of that rule is caught by the test suite.
        const { ht, fodec, tva, ttc } = calcLineTotals(
            {
                quantite: "1",
                prixHT: "1000",
                remise: "0",
                tauxTVA: "19",
                fodec: true,
                tauxFodec: "1",
            },
            true,
        );
        expect(ht.eq(1000)).toBe(true);
        expect(fodec.eq(10)).toBe(true);
        expect(tva.eq(0)).toBe(true);
        expect(ttc.eq(1010)).toBe(true);
    });

    it("yields ttc === ht when exonereTVA=true and no FODEC", () => {
        const { ht, fodec, tva, ttc } = calcLineTotals(
            {
                quantite: "3",
                prixHT: "100",
                remise: "0",
                tauxTVA: "19",
            },
            true,
        );
        expect(ht.eq(300)).toBe(true);
        expect(fodec.eq(0)).toBe(true);
        expect(tva.eq(0)).toBe(true);
        expect(ttc.eq(ht)).toBe(true);
    });

    it("handles a 0% TVA rate", () => {
        const { tva, ttc } = calcLineTotals({
            quantite: "1",
            prixHT: "100",
            remise: "0",
            tauxTVA: "0",
        });
        expect(tva.eq(0)).toBe(true);
        expect(ttc.eq(100)).toBe(true);
    });

    it("handles the 7% reduced TVA rate", () => {
        const { tva, ttc } = calcLineTotals({
            quantite: "1",
            prixHT: "500",
            remise: "0",
            tauxTVA: "7",
        });
        expect(tva.eq(35)).toBe(true);
        expect(ttc.eq(535)).toBe(true);
    });

    it("handles the standard 19% TVA rate", () => {
        const { tva } = calcLineTotals({
            quantite: "1",
            prixHT: "1000",
            remise: "0",
            tauxTVA: "19",
        });
        expect(tva.eq(190)).toBe(true);
    });

    it("returns all-zero totals when quantity is 0", () => {
        const { ht, fodec, tva, ttc } = calcLineTotals({
            quantite: "0",
            prixHT: "100",
            remise: "0",
            tauxTVA: "19",
            fodec: true,
            tauxFodec: "1",
        });
        expect(ht.eq(0)).toBe(true);
        expect(fodec.eq(0)).toBe(true);
        expect(tva.eq(0)).toBe(true);
        expect(ttc.eq(0)).toBe(true);
    });

    it("returns all-zero totals when price is 0", () => {
        const { ht, fodec, tva, ttc } = calcLineTotals({
            quantite: "10",
            prixHT: "0",
            remise: "0",
            tauxTVA: "19",
            fodec: true,
            tauxFodec: "1",
        });
        expect(ht.eq(0)).toBe(true);
        expect(fodec.eq(0)).toBe(true);
        expect(tva.eq(0)).toBe(true);
        expect(ttc.eq(0)).toBe(true);
    });

    it("falls back to prixAchat when prixHT is missing", () => {
        const { ht } = calcLineTotals({
            quantite: "2",
            prixAchat: "150",
            remise: "0",
            tauxTVA: "19",
        });
        expect(ht.eq(300)).toBe(true);
    });

    it("prefers prixHT over prixAchat when both are provided", () => {
        const { ht } = calcLineTotals({
            quantite: "1",
            prixHT: "100",
            prixAchat: "999",
            remise: "0",
            tauxTVA: "19",
        });
        expect(ht.eq(100)).toBe(true);
    });

    it("defaults to a zero price when neither prixHT nor prixAchat is provided", () => {
        const { ht, ttc } = calcLineTotals({
            quantite: "4",
            remise: "0",
            tauxTVA: "19",
        });
        expect(ht.eq(0)).toBe(true);
        expect(ttc.eq(0)).toBe(true);
    });

    it("parses Tunisian-formatted inputs (dot = thousands separator)", () => {
        const { ht, tva, ttc } = calcLineTotals({
            quantite: "2",
            prixHT: "1.500",
            remise: "0",
            tauxTVA: "19",
        });
        expect(ht.eq(3000)).toBe(true);
        expect(tva.eq(570)).toBe(true);
        expect(ttc.eq(3570)).toBe(true);
    });

    it("keeps ht + fodec + tva === ttc on a mixed multi-line invoice", () => {
        const lines = [
            { quantite: "3", prixHT: "120.5", remise: "0", tauxTVA: "19" },
            { quantite: "1", prixHT: "250", remise: "5", tauxTVA: "7", fodec: true, tauxFodec: "1" },
            { quantite: "10", prixHT: "9.9", remise: "0", tauxTVA: "0" },
        ];
        const totals = lines.map((line) => calcLineTotals(line));

        // Line 1: 3 × 120.5 = 361.5 HT, TVA 19% = 68.685
        expect(totals[0].ht.eq("361.5")).toBe(true);
        expect(totals[0].tva.eq("68.685")).toBe(true);
        // Line 2: 250 × 0.95 = 237.5 HT, FODEC 1% = 2.375, TVA 7% = 16.625
        expect(totals[1].ht.eq("237.5")).toBe(true);
        expect(totals[1].fodec.eq("2.375")).toBe(true);
        expect(totals[1].tva.eq("16.625")).toBe(true);
        // Line 3: 10 × 9.9 = 99 HT, TVA 0%
        expect(totals[2].ht.eq("99")).toBe(true);
        expect(totals[2].tva.eq(0)).toBe(true);

        // Invariant: ht + fodec + tva === ttc on every line.
        for (const t of totals) {
            expect(t.ht.plus(t.fodec).plus(t.tva).eq(t.ttc)).toBe(true);
        }

        // Invoice-level coherence.
        const sumHT = totals.reduce((acc, t) => acc.plus(t.ht), new Big(0));
        const sumFodec = totals.reduce((acc, t) => acc.plus(t.fodec), new Big(0));
        const sumTVA = totals.reduce((acc, t) => acc.plus(t.tva), new Big(0));
        const sumTTC = totals.reduce((acc, t) => acc.plus(t.ttc), new Big(0));
        expect(sumHT.eq("698")).toBe(true);
        expect(sumFodec.eq("2.375")).toBe(true);
        expect(sumTVA.eq("85.31")).toBe(true);
        expect(sumHT.plus(sumFodec).plus(sumTVA).eq(sumTTC)).toBe(true);
        expect(sumTTC.eq("785.685")).toBe(true);
    });
});
