import { describe, it, expect } from "vitest";
import {
    horizons,
    sumRowAllocations,
    formatMontantDT,
    echeanceJoursTone,
    echeanceJoursLabel,
} from "@/components/effets/nouvel-effet-split-logic";
import type { SplitRow } from "@/components/effets/effet-split-logic";

const makeRow = (allocations: { achatId: string; montant: string }[]): SplitRow => ({
    id: "row-1",
    ordrePaiementNumero: "1",
    dateEcheance: "2026-02-01",
    allocations,
});

describe("horizons", () => {
    it("starts with the null 'Tous' filter and covers 30/60/90/120", () => {
        expect(horizons.map((h) => h.value)).toEqual([null, 30, 60, 90, 120]);
    });
});

describe("sumRowAllocations", () => {
    it("sums valid montants with 3-decimal float drift", () => {
        expect(sumRowAllocations(makeRow([
            { achatId: "a", montant: "0.1" },
            { achatId: "b", montant: "0.2" },
        ]))).toBeCloseTo(0.3, 6);
    });
    it("treats empty or non-numeric montants as 0", () => {
        expect(sumRowAllocations(makeRow([
            { achatId: "a", montant: "" },
            { achatId: "b", montant: "abc" },
            { achatId: "c", montant: "11500" },
        ]))).toBe(11500);
    });
    it("returns 0 for a row without allocation", () => {
        expect(sumRowAllocations(makeRow([]))).toBe(0);
    });
});

describe("formatMontantDT", () => {
    it("rounds to 3 decimals and appends the unit", () => {
        expect(formatMontantDT(0.1 + 0.2)).toBe("0.300 DT");
    });
    it("formats integer amounts as-is", () => {
        expect(formatMontantDT(11500)).toBe("11500.000 DT");
    });
});

describe("echeanceJoursTone", () => {
    it("keeps the original urgency ladder boundaries", () => {
        expect(echeanceJoursTone(0)).toBe("text-red-600 font-semibold");
        expect(echeanceJoursTone(3)).toBe("text-red-600 font-semibold");
        expect(echeanceJoursTone(4)).toBe("text-amber-600 font-medium");
        expect(echeanceJoursTone(7)).toBe("text-amber-600 font-medium");
        expect(echeanceJoursTone(8)).toBe("text-sky-600 font-medium");
        expect(echeanceJoursTone(15)).toBe("text-sky-600 font-medium");
        expect(echeanceJoursTone(16)).toBe("text-emerald-600 font-medium");
    });
});

describe("echeanceJoursLabel", () => {
    it("labels day 0 as today, otherwise J-n", () => {
        expect(echeanceJoursLabel(0)).toBe("Aujourd'hui");
        expect(echeanceJoursLabel(12)).toBe("J-12");
    });
});
