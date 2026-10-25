/**
 * Tests des clés déterministes `cleSource` — lot D2.
 * Le format DOIT rester identique au backfill D1 (idempotence).
 */
import { describe, expect, it } from "vitest";
import {
    analyserCleSource,
    cleSourceAvecSuffixe,
    cleSourceAgios,
    cleSourceCheque,
    cleSourceContrepassation,
    cleSourceEffet,
    cleSourceMouvementFinancier,
    cleSourcePayment,
} from "@/lib/tresorerie/source-keys";

describe("source-keys — format D1 préservé", () => {
    it("produit les formats payment:<id>, cheque:<id>, effet:<id>, mf:<id>", () => {
        expect(cleSourcePayment("p1")).toBe("payment:p1");
        expect(cleSourceCheque("c1")).toBe("cheque:c1");
        expect(cleSourceEffet("e1")).toBe("effet:e1");
        expect(cleSourceMouvementFinancier("m1")).toBe("mf:m1");
    });

    it("n'accepte que les suffixes D2 autorisés (agios, contrepassation)", () => {
        expect(cleSourceAgios("effet:e1")).toBe("effet:e1:agios");
        expect(cleSourceContrepassation("payment:p1")).toBe("payment:p1:contrepassation");
        expect(() => cleSourceAvecSuffixe("payment:p1", "autre" as "agios")).toThrow();
    });
});

describe("source-keys — analyse", () => {
    it("décompose une clé simple", () => {
        expect(analyserCleSource("payment:p1")).toEqual({ type: "payment", id: "p1", suffixe: null });
        expect(analyserCleSource("mf:m1")).toEqual({ type: "mf", id: "m1", suffixe: null });
    });

    it("décompose une clé suffixée", () => {
        expect(analyserCleSource("effet:e1:agios")).toEqual({ type: "effet", id: "e1", suffixe: "agios" });
        expect(analyserCleSource("payment:p1:contrepassation")).toEqual({
            type: "payment",
            id: "p1",
            suffixe: "contrepassation",
        });
    });

    it("rejette les formats invalides", () => {
        expect(analyserCleSource("inconnu:x")).toBeNull();
        expect(analyserCleSource("payment:")).toBeNull();
        expect(analyserCleSource("payment:p1:suffixe-inconnu")).toBeNull();
        // `trop` n'est pas un suffixe D2 : même après un suffixe valide, la clé est rejetée.
        expect(analyserCleSource("payment:p1:agios:trop")).toBeNull();
    });

    it("accepte la chaîne agios:contrepassation (contre-passation d'une écriture d'agios)", () => {
        expect(analyserCleSource("effet:e1:agios:contrepassation")).toEqual({
            type: "effet",
            id: "e1",
            suffixe: "agios:contrepassation",
        });
        expect(analyserCleSource("payment:p1:agios:contrepassation")).toEqual({
            type: "payment",
            id: "p1",
            suffixe: "agios:contrepassation",
        });
    });

    it("rejette toute autre combinaison de suffixes (ordre, répétition, longueur)", () => {
        // L'ordre est significatif : agios AVANT contre-passation, jamais l'inverse.
        expect(analyserCleSource("effet:e1:contrepassation:agios")).toBeNull();
        expect(analyserCleSource("effet:e1:agios:agios")).toBeNull();
        expect(analyserCleSource("effet:e1:contrepassation:contrepassation")).toBeNull();
        // 3 suffixes ou plus : jamais une chaîne autorisée.
        expect(analyserCleSource("effet:e1:agios:contrepassation:trop")).toBeNull();
        expect(analyserCleSource("effet:e1:agios:agios:contrepassation")).toBeNull();
        expect(analyserCleSource("effet:e1:agios:")).toBeNull();
    });
});
