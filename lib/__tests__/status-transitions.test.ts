import { describe, it, expect } from "vitest";
import {
    isValidEffetTransition,
    isValidInvoiceTransition,
    VALID_EFFET_TRANSITIONS,
    VALID_INVOICE_TRANSITIONS,
    getAllowedTransitions,
} from "../status-transitions";

describe("isValidEffetTransition", () => {
    it("allows EN_PORTEFEUILLE → REMIS_ESCOMPTE", () => {
        expect(isValidEffetTransition("EN_PORTEFEUILLE", "REMIS_ESCOMPTE")).toBe(true);
    });
    it("allows EN_PORTEFEUILLE → PAYE", () => {
        expect(isValidEffetTransition("EN_PORTEFEUILLE", "PAYE")).toBe(true);
    });
    it("allows EN_PORTEFEUILLE → ANNULE", () => {
        expect(isValidEffetTransition("EN_PORTEFEUILLE", "ANNULE")).toBe(true);
    });
    it("rejects PAYE → EN_PORTEFEUILLE (terminal state)", () => {
        expect(isValidEffetTransition("PAYE", "EN_PORTEFEUILLE")).toBe(false);
    });
    it("rejects ANNULE → any", () => {
        expect(isValidEffetTransition("ANNULE", "PAYE")).toBe(false);
    });
    it("rejects unknown status", () => {
        expect(isValidEffetTransition("UNKNOWN", "PAYE")).toBe(false);
    });
    it("allows REMIS_ESCOMPTE → PAYE", () => {
        expect(isValidEffetTransition("REMIS_ESCOMPTE", "PAYE")).toBe(true);
    });
    it("allows IMPAYE → PAYE", () => {
        expect(isValidEffetTransition("IMPAYE", "PAYE")).toBe(true);
    });
    it("rejects REMIS_ESCOMPTE → EN_PORTEFEUILLE", () => {
        expect(isValidEffetTransition("REMIS_ESCOMPTE", "EN_PORTEFEUILLE")).toBe(false);
    });
});

describe("isValidInvoiceTransition", () => {
    it("allows BROUILLON → ENVOYEE", () => {
        expect(isValidInvoiceTransition("BROUILLON", "ENVOYEE")).toBe(true);
    });
    it("allows BROUILLON → ANNULEE", () => {
        expect(isValidInvoiceTransition("BROUILLON", "ANNULEE")).toBe(true);
    });
    it("allows ENVOYEE → PAYEE", () => {
        expect(isValidInvoiceTransition("ENVOYEE", "PAYEE")).toBe(true);
    });
    it("allows ENVOYEE → PARTIELLE", () => {
        expect(isValidInvoiceTransition("ENVOYEE", "PARTIELLE")).toBe(true);
    });
    it("allows ENVOYEE → EN_RETARD", () => {
        expect(isValidInvoiceTransition("ENVOYEE", "EN_RETARD")).toBe(true);
    });
    it("rejects PAYEE → BROUILLON (terminal state)", () => {
        expect(isValidInvoiceTransition("PAYEE", "BROUILLON")).toBe(false);
    });
    it("rejects ANNULEE → any", () => {
        expect(isValidInvoiceTransition("ANNULEE", "ENVOYEE")).toBe(false);
    });
    it("rejects PARTIELLE → BROUILLON", () => {
        expect(isValidInvoiceTransition("PARTIELLE", "BROUILLON")).toBe(false);
    });
    it("allows EN_RETARD → PAYEE", () => {
        expect(isValidInvoiceTransition("EN_RETARD", "PAYEE")).toBe(true);
    });
});

describe("getAllowedTransitions", () => {
    it("returns allowed transitions for EN_PORTEFEUILLE", () => {
        const transitions = getAllowedTransitions("EN_PORTEFEUILLE", VALID_EFFET_TRANSITIONS);
        expect(transitions).toContain("PAYE");
        expect(transitions).toContain("ANNULE");
        expect(transitions).not.toContain("EN_PORTEFEUILLE");
    });
    it("returns empty array for terminal state", () => {
        const transitions = getAllowedTransitions("PAYE", VALID_EFFET_TRANSITIONS);
        expect(transitions).toEqual([]);
    });
    it("returns empty array for unknown status", () => {
        const transitions = getAllowedTransitions("UNKNOWN", VALID_EFFET_TRANSITIONS);
        expect(transitions).toEqual([]);
    });
});
