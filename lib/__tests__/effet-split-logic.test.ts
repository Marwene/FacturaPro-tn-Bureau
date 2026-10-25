import { describe, it, expect } from "vitest";
import {
    round3,
    generateSplit,
    computeSplitState,
    appendSplitRow,
    setSplitRowField,
    removeSplitRow,
    setSplitAllocField,
    removeSplitAlloc,
    appendSplitAlloc,
    type SplitRow,
    type SplitAllocation,
} from "@/components/effets/effet-split-logic";
import type { DocumentLie } from "@/hooks/use-effets";

const makeDoc = (id: string, numero: string, totalTTC: string, resteAPayer?: string): DocumentLie => ({
    id,
    numero,
    totalTTC,
    dateEcheance: "2026-01-15",
    ...(resteAPayer !== undefined ? { resteAPayer } : {}),
});

const makeRow = (
    id: string,
    ordrePaiementNumero: string,
    allocations: SplitAllocation[],
    dateEcheance = "2026-02-01",
): SplitRow => ({ id, ordrePaiementNumero, dateEcheance, allocations });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// --- round3 ---

describe("round3", () => {
    it("rounds 0.1 + 0.2 float drift to 0.3", () => {
        expect(round3(0.1 + 0.2)).toBe(0.3);
    });
    it("rounds to 3 decimals (half up)", () => {
        expect(round3(12.3456)).toBe(12.346);
    });
    it("rounds below half-millime to zero", () => {
        expect(round3(0.0004)).toBe(0);
    });
    it("leaves integers untouched", () => {
        expect(round3(11500)).toBe(11500);
    });
});

// --- generateSplit ---

describe("generateSplit", () => {
    const doc20000 = makeDoc("A1", "ACH-1", "20000");

    it("splits at the default 11500 threshold", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1"],
            documents: [doc20000],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: undefined,
        });
        expect(rows).toHaveLength(2);
        expect(rows[0].allocations[0].montant).toBe("11500.000");
        expect(rows[1].allocations[0].montant).toBe("8500.000");
    });

    it("splits with a custom threshold (k = ceil(reste / seuil))", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1"],
            documents: [makeDoc("A1", "ACH-1", "12000")],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: "5000",
        });
        expect(rows).toHaveLength(3);
        expect(rows.map((r) => r.allocations[0].montant)).toEqual(["5000.000", "5000.000", "2000.000"]);
    });

    it("produces a single row when reste equals the threshold", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1"],
            documents: [makeDoc("A1", "ACH-1", "11500")],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: undefined,
        });
        expect(rows).toHaveLength(1);
        expect(rows[0].allocations[0].montant).toBe("11500.000");
    });

    it("produces a single full row when reste is below the threshold", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1"],
            documents: [makeDoc("A1", "ACH-1", "300")],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: undefined,
        });
        expect(rows).toHaveLength(1);
        expect(rows[0].allocations[0].montant).toBe("300.000");
    });

    it("rounds the last tranche to 3 decimals when reste is not a whole millime multiple", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1"],
            documents: [makeDoc("A1", "ACH-1", "100.5")],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: "60",
        });
        expect(rows).toHaveLength(2);
        expect(rows[1].allocations[0].montant).toBe("40.500");
    });

    it("prefers resteAPayer over totalTTC and skips documents fully paid (reste <= 0)", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1", "A2"],
            documents: [makeDoc("A1", "ACH-1", "900", "5000"), makeDoc("A2", "ACH-2", "900", "0")],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: undefined,
        });
        expect(rows).toHaveLength(1);
        expect(rows[0].allocations[0].achatId).toBe("A1");
        expect(rows[0].allocations[0].montant).toBe("5000.000");
    });

    it("ignores unknown document ids", () => {
        const rows = generateSplit({
            selectedDocIds: ["NOPE"],
            documents: [doc20000],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: undefined,
        });
        expect(rows).toHaveLength(0);
    });

    it("assigns unique UUID ids, sequential ordre and the requested date", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1", "B1"],
            documents: [doc20000, makeDoc("B1", "ACH-2", "500")],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: undefined,
        });
        expect(rows).toHaveLength(3);
        for (const r of rows) {
            expect(r.id).toMatch(UUID_RE);
            expect(r.dateEcheance).toBe("2026-03-01");
        }
        expect(new Set(rows.map((r) => r.id)).size).toBe(3);
        expect(rows.map((r) => r.ordrePaiementNumero)).toEqual(["1", "2", "3"]);
    });

    it("falls back to today's date when dateEcheance is empty", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1"],
            documents: [makeDoc("A1", "ACH-1", "500")],
            dateEcheance: "",
            seuilSplitEffet: undefined,
        });
        expect(rows[0].dateEcheance).toBe(new Date().toISOString().split("T")[0]);
    });

    it("partitions the reste exactly (sum of tranches === reste)", () => {
        const rows = generateSplit({
            selectedDocIds: ["A1"],
            documents: [makeDoc("A1", "ACH-1", "27500")],
            dateEcheance: "2026-03-01",
            seuilSplitEffet: "10000",
        });
        // k = ceil(27500 / 10000) = 3 → 10000 + 10000 + 7500
        expect(rows.map((r) => r.allocations[0].montant)).toEqual(["10000.000", "10000.000", "7500.000"]);
        const sum = rows.reduce((acc, r) => acc + Number(r.allocations[0].montant), 0);
        expect(sum).toBe(27500);
    });
});

// --- computeSplitState ---

describe("computeSplitState", () => {
    const docA = makeDoc("A1", "ACH-1", "11500");
    const coveredRows = [makeRow("R1", "1", [{ achatId: "A1", montant: "11500.000" }])];

    it("reports full coverage as valid", () => {
        const state = computeSplitState({
            splitRows: coveredRows,
            selectedDocIds: ["A1"],
            selectedDocs: [docA],
        });
        expect(state.totalACouvrir).toBe(11500);
        expect(state.totalReparti).toBe(11500);
        expect(state.uncoveredAchats).toHaveLength(0);
        expect(state.rowsValid).toBe(true);
        expect(state.splitValid).toBe(true);
        expect(state.splitErrors).toEqual([]);
    });

    it("computes totalACouvrir from resteAPayer, falling back to totalTTC", () => {
        const state = computeSplitState({
            splitRows: [],
            selectedDocIds: ["A1"],
            selectedDocs: [makeDoc("A1", "ACH-1", "99999", "42")],
        });
        expect(state.totalACouvrir).toBe(42);
    });

    it("accepts a coverage gap within the 0.001 tolerance", () => {
        const state = computeSplitState({
            splitRows: [makeRow("R1", "1", [{ achatId: "A1", montant: "100.0005" }])],
            selectedDocIds: ["A1"],
            selectedDocs: [makeDoc("A1", "ACH-1", "100")],
        });
        expect(state.uncoveredAchats).toHaveLength(0);
        expect(state.splitValid).toBe(true);
    });

    it("flags a coverage gap beyond the 0.001 tolerance and explains the remainder", () => {
        const state = computeSplitState({
            splitRows: [makeRow("R1", "1", [{ achatId: "A1", montant: "60" }])],
            selectedDocIds: ["A1"],
            selectedDocs: [makeDoc("A1", "ACH-1", "100")],
        });
        expect(state.uncoveredAchats.map((d) => d.id)).toEqual(["A1"]);
        expect(state.splitValid).toBe(false);
        expect(state.splitErrors).toHaveLength(1);
        expect(state.splitErrors[0]).toContain("Montants restants non couverts");
        expect(state.splitErrors[0]).toContain("ACH-1");
        expect(state.splitErrors[0]).toContain("40,000 DT");
    });

    it("rejects rows without any allocation", () => {
        const state = computeSplitState({
            splitRows: [makeRow("R1", "1", [])],
            selectedDocIds: ["A1"],
            selectedDocs: [docA],
        });
        expect(state.rowsValid).toBe(false);
        expect(state.splitErrors).toContain("Chaque effet doit avoir au moins un achat alloué.");
    });

    it("rejects non-positive allocation amounts", () => {
        const state = computeSplitState({
            splitRows: [makeRow("R1", "1", [{ achatId: "A1", montant: "0" }])],
            selectedDocIds: ["A1"],
            selectedDocs: [docA],
        });
        expect(state.rowsValid).toBe(false);
        expect(state.splitErrors).toContain("Chaque montant alloué doit être strictement positif.");
    });

    it("rejects rows without an échéance date", () => {
        const state = computeSplitState({
            splitRows: [makeRow("R1", "1", [{ achatId: "A1", montant: "11500" }], "")],
            selectedDocIds: ["A1"],
            selectedDocs: [docA],
        });
        expect(state.rowsValid).toBe(false);
        expect(state.splitErrors).toContain("Chaque effet doit avoir une date d'échéance.");
    });

    it("is invalid without any selected document and reports no errors", () => {
        const state = computeSplitState({
            splitRows: coveredRows,
            selectedDocIds: [],
            selectedDocs: [docA],
        });
        expect(state.rowsValid).toBe(true);
        expect(state.splitValid).toBe(false);
        expect(state.splitErrors).toEqual([]);
    });
});

// --- row / allocation helpers (immutability) ---

describe("split row helpers", () => {
    const rows = [
        makeRow("R1", "1", [{ achatId: "A1", montant: "500" }, { achatId: "B1", montant: "300" }]),
        makeRow("R2", "2", [{ achatId: "A1", montant: "200" }]),
    ];
    // A1: reste 1000, already allocated 700 → still uncovered (300 missing).
    // B1: reste 300, already allocated 300 → fully covered.
    const docs = [makeDoc("A1", "ACH-1", "1000"), makeDoc("B1", "ACH-2", "300")];

    it("appendSplitRow adds a row targeting the first uncovered document, without mutating the input", () => {
        const frozenSnapshot = JSON.parse(JSON.stringify(rows)) as SplitRow[];
        const result = appendSplitRow(rows, {
            selectedDocIds: ["A1", "B1"],
            documents: docs,
            dateEcheance: "2026-04-01",
        });
        expect(result).toHaveLength(3);
        expect(result[2].allocations).toEqual([{ achatId: "A1", montant: "" }]);
        expect(result[2].ordrePaiementNumero).toBe("3");
        expect(result[2].dateEcheance).toBe("2026-04-01");
        expect(rows).toEqual(frozenSnapshot);
        expect(result).not.toBe(rows);
    });

    it("appendSplitRow adds an empty allocation when every document is fully covered", () => {
        const docA1 = makeDoc("A1", "ACH-1", "700");
        const covered = [makeRow("R1", "1", [{ achatId: "A1", montant: "700" }])];
        const result = appendSplitRow(covered, {
            selectedDocIds: ["A1"],
            documents: [docA1],
            dateEcheance: "",
        });
        expect(result[1].allocations).toEqual([]);
        expect(result[1].dateEcheance).toBe(new Date().toISOString().split("T")[0]);
    });

    it("setSplitRowField updates only the target row, without mutating the input", () => {
        const frozenSnapshot = JSON.parse(JSON.stringify(rows)) as SplitRow[];
        const result = setSplitRowField(rows, "R1", "dateEcheance", "2026-05-01");
        expect(result[0].dateEcheance).toBe("2026-05-01");
        expect(result[1]).toBe(rows[1]);
        expect(rows).toEqual(frozenSnapshot);
        expect(result).not.toBe(rows);
    });

    it("setSplitRowField can update the ordre number", () => {
        const result = setSplitRowField(rows, "R2", "ordrePaiementNumero", "10");
        expect(result[1].ordrePaiementNumero).toBe("10");
    });

    it("removeSplitRow removes the target row, without mutating the input", () => {
        const frozenSnapshot = JSON.parse(JSON.stringify(rows)) as SplitRow[];
        const result = removeSplitRow(rows, "R1");
        expect(result.map((r) => r.id)).toEqual(["R2"]);
        expect(rows).toEqual(frozenSnapshot);
    });

    it("setSplitAllocField updates only the targeted allocation, without mutating the input", () => {
        const frozenSnapshot = JSON.parse(JSON.stringify(rows)) as SplitRow[];
        const result = setSplitAllocField(rows, "R1", 1, "montant", "350");
        expect(result[0].allocations[1].montant).toBe("350");
        expect(result[0].allocations[0]).toBe(rows[0].allocations[0]);
        expect(result[1]).toBe(rows[1]);
        expect(rows).toEqual(frozenSnapshot);
    });

    it("setSplitAllocField can re-target the achatId", () => {
        const result = setSplitAllocField(rows, "R2", 0, "achatId", "B1");
        expect(result[1].allocations[0].achatId).toBe("B1");
    });

    it("removeSplitAlloc removes the targeted allocation, without mutating the input", () => {
        const frozenSnapshot = JSON.parse(JSON.stringify(rows)) as SplitRow[];
        const result = removeSplitAlloc(rows, "R1", 0);
        expect(result[0].allocations).toHaveLength(1);
        expect(result[0].allocations[0].achatId).toBe("B1");
        expect(rows).toEqual(frozenSnapshot);
    });

    it("appendSplitAlloc appends an empty allocation to the target row, without mutating the input", () => {
        const frozenSnapshot = JSON.parse(JSON.stringify(rows)) as SplitRow[];
        const result = appendSplitAlloc(rows, "R2");
        expect(result[1].allocations).toHaveLength(2);
        expect(result[1].allocations[1]).toEqual({ achatId: "", montant: "" });
        expect(rows).toEqual(frozenSnapshot);
    });

    it("all helpers leave untouched rows referentially identical", () => {
        expect(setSplitRowField(rows, "R1", "dateEcheance", "x")[1]).toBe(rows[1]);
        expect(setSplitAllocField(rows, "R1", 0, "montant", "1")[1]).toBe(rows[1]);
        expect(removeSplitAlloc(rows, "R1", 0)[1]).toBe(rows[1]);
        expect(appendSplitAlloc(rows, "R1")[1]).toBe(rows[1]);
        expect(appendSplitRow(rows, { selectedDocIds: [], documents: [], dateEcheance: "" })[0]).toBe(rows[0]);
    });
});
