import { describe, it, expect } from "vitest";
import { montantEnLettres } from "@/lib/pdf-numbers";

describe("montantEnLettres", () => {
    it("writes zero in TND", () => {
        expect(montantEnLettres(0)).toBe("zéro dinar tunisien");
    });

    it("uses the singular for 1 TND", () => {
        expect(montantEnLettres(1)).toBe("un dinar tunisien");
    });

    it("uses the plural from 2 TND", () => {
        expect(montantEnLettres(2)).toBe("deux dinars tunisiens");
    });

    it("writes a round thousand", () => {
        expect(montantEnLettres(1500)).toBe("mille cinq cents dinars tunisiens");
    });

    it("appends millimes for the fractional part (3 decimals in TND)", () => {
        expect(montantEnLettres(1234.567)).toBe(
            "mille deux cent trente-quatre dinars tunisiens et cinq cent soixante-sept millimes",
        );
        expect(montantEnLettres(0.5)).toBe("zéro dinar tunisien et cinq cents millimes");
    });

    it("writes EUR with centimes", () => {
        expect(montantEnLettres(7.5, "EUR")).toBe("sept euros et cinquante centimes");
    });

    it("falls back to TND labels for an unknown devise", () => {
        expect(montantEnLettres(3, "XYZ")).toBe("trois dinars tunisiens");
    });

    it("ignores the sign of the amount", () => {
        expect(montantEnLettres(-2)).toBe("deux dinars tunisiens");
    });

    it("always returns a non-empty textual amount", () => {
        const text = montantEnLettres(99.99);
        expect(text.length).toBeGreaterThan(0);
        expect(text).toContain("dinars tunisiens");
        expect(text).toContain("millimes");
    });
});
