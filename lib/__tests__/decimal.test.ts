import { describe, it, expect } from "vitest";
import Big from "big.js";
import {
    serializeDecimal,
    deserializeDecimal,
    formatTND,
    formatCurrency,
    formatPercent,
    parseTunisianNumber,
    calcLineHT,
    calcTVA,
    calcFodec,
    calcRetenue,
    serializeDecimals,
} from "../decimal";

// --- serializeDecimal ---

describe("serializeDecimal", () => {
    it("returns '0' for null", () => {
        expect(serializeDecimal(null)).toBe("0");
    });
    it("returns '0' for undefined", () => {
        expect(serializeDecimal(undefined)).toBe("0");
    });
    it("converts Decimal-like object to string", () => {
        // Mock a Prisma Decimal object (has s, e, d internals + toString + toNumber)
        const mock = { toString: () => "123.456", toNumber: () => 123.456, s: 1, e: 3, d: [1, 2, 3] };
        expect(serializeDecimal(mock)).toBe("123.456");
    });
});

// --- deserializeDecimal ---

describe("deserializeDecimal", () => {
    it("returns Big(0) for null", () => {
        expect(deserializeDecimal(null).eq(0)).toBe(true);
    });
    it("returns Big(0) for empty string", () => {
        expect(deserializeDecimal("").eq(0)).toBe(true);
    });
    it("parses valid decimal string", () => {
        expect(deserializeDecimal("123.456").eq(123.456)).toBe(true);
    });
    it("returns Big(0) for invalid string", () => {
        expect(deserializeDecimal("abc").eq(0)).toBe(true);
    });
});

// --- formatTND ---

describe("formatTND", () => {
    it("formats number with DT suffix and space-separated thousands", () => {
        expect(formatTND("1234.567")).toBe("1\u00A0234,567 DT");
    });
    it("returns '0,000 DT' for null", () => {
        expect(formatTND(null)).toBe("0,000 DT");
    });
    it("returns '0,000 DT' for undefined", () => {
        expect(formatTND(undefined)).toBe("0,000 DT");
    });
    it("formats Big instance", () => {
        expect(formatTND(new Big("100"))).toBe("100,000 DT");
    });
    it("formats zero", () => {
        expect(formatTND("0")).toBe("0,000 DT");
    });
    it("formats small decimal", () => {
        expect(formatTND("0.5")).toBe("0,500 DT");
    });
});

// --- formatCurrency ---

describe("formatCurrency", () => {
    it("formats TND with 3 decimals and DT suffix", () => {
        expect(formatCurrency("1234.567", "TND")).toBe("1\u00A0234,567 DT");
    });
    it("formats EUR with 2 decimals and € suffix", () => {
        expect(formatCurrency("1234.567", "EUR")).toBe("1\u00A0234,57€");
    });
    it("formats USD with 2 decimals and $ prefix", () => {
        expect(formatCurrency("1234.567", "USD")).toBe("$1,234.57");
    });
    it("falls back to TND for unknown devise", () => {
        expect(formatCurrency("100", "XYZ")).toBe("100,000 DT");
    });
    it("returns fallback for null", () => {
        expect(formatCurrency(null, "USD")).toBe("$0,000");
    });
    it("returns fallback for invalid string", () => {
        expect(formatCurrency("abc", "EUR")).toBe("0,00€");
    });
    it("formats empty string as zero", () => {
        expect(formatCurrency("", "TND")).toBe("0,000 DT");
    });
    it("pads EUR with trailing zeros to 2 decimals", () => {
        expect(formatCurrency("1234.5", "EUR")).toBe("1\u00A0234,50€");
    });
    it("rounds USD half-up and groups thousands with commas", () => {
        expect(formatCurrency("999.999", "USD")).toBe("$1,000.00");
    });
    it("formats EUR zero as '0,00€'", () => {
        expect(formatCurrency("0", "EUR")).toBe("0,00€");
    });
    it("keeps 3 decimals for Big instance with unknown devise", () => {
        expect(formatCurrency(new Big("1234.5"), "XYZ")).toBe("1\u00A0234,500 DT");
    });
});

// --- formatPercent ---

describe("formatPercent", () => {
    it("formats decimal as percent with 1 decimal", () => {
        expect(formatPercent("19.5")).toBe("19.5%");
    });
    it("formats whole number", () => {
        expect(formatPercent("19")).toBe("19.0%");
    });
    it("returns '0%' for null", () => {
        expect(formatPercent(null)).toBe("0%");
    });
    it("returns '0%' for undefined", () => {
        expect(formatPercent(undefined)).toBe("0%");
    });
    it("returns '0%' for empty string", () => {
        expect(formatPercent("")).toBe("0%");
    });
    it("returns '0%' for invalid string", () => {
        expect(formatPercent("abc")).toBe("0%");
    });
});

// --- parseTunisianNumber ---

describe("parseTunisianNumber", () => {
    it("parses '1.500' as 1500 (dot = thousands)", () => {
        expect(parseTunisianNumber("1.500")).toBe(1500);
    });
    it("parses '1,5' as 1.5 (comma = decimal)", () => {
        expect(parseTunisianNumber("1,5")).toBe(1.5);
    });
    it("parses '1.500,5' as 1500.5", () => {
        expect(parseTunisianNumber("1.500,5")).toBe(1500.5);
    });
    it("returns 0 for empty string", () => {
        expect(parseTunisianNumber("")).toBe(0);
    });
    it("parses plain number without separators", () => {
        expect(parseTunisianNumber("123.45")).toBe(123.45);
    });
    it("trims whitespace", () => {
        expect(parseTunisianNumber("  1.500,5  ")).toBe(1500.5);
    });
    it("parses large number with thousands separator", () => {
        expect(parseTunisianNumber("12.345.678,9")).toBe(12345678.9);
    });
    it("parses '12.345.678' as 12345678 (dot grouping, no comma)", () => {
        expect(parseTunisianNumber("12.345.678")).toBe(12345678);
    });
    it("parses '30.00' as 30 (last dot = decimal)", () => {
        expect(parseTunisianNumber("30.00")).toBe(30);
    });
    it("parses '1.5' as 1.5 (single digit after dot = decimal)", () => {
        expect(parseTunisianNumber("1.5")).toBe(1.5);
    });
    it("parses '1.5000' as 1.5 (4 digits after dot = decimal)", () => {
        expect(parseTunisianNumber("1.5000")).toBe(1.5);
    });
});

// --- calcLineHT ---

describe("calcLineHT", () => {
    it("calculates basic HT without discount", () => {
        const result = calcLineHT("10", "100", "0");
        expect(result.eq(1000)).toBe(true);
    });
    it("applies 10% discount", () => {
        const result = calcLineHT("10", "100", "10");
        expect(result.eq(900)).toBe(true);
    });
    it("handles zero quantity", () => {
        const result = calcLineHT("0", "100", "0");
        expect(result.eq(0)).toBe(true);
    });
    it("handles 100% discount (free)", () => {
        const result = calcLineHT("5", "200", "100");
        expect(result.eq(0)).toBe(true);
    });
    it("applies fractional discount", () => {
        const result = calcLineHT("2", "50", "15.5");
        // 2 * 50 * (1 - 0.155) = 100 * 0.845 = 84.5
        expect(result.eq(84.5)).toBe(true);
    });
    it("returns zero when price is zero", () => {
        expect(calcLineHT("5", "0", "0").eq(0)).toBe(true);
    });
    it("returns zero when amount is fully zero", () => {
        expect(calcLineHT("0", "0", "0").eq(0)).toBe(true);
    });
});

// --- calcTVA ---

describe("calcTVA", () => {
    it("calculates 19% TVA", () => {
        const result = calcTVA(new Big("1000"), "19");
        expect(result.eq(190)).toBe(true);
    });
    it("calculates 0% TVA", () => {
        const result = calcTVA(new Big("1000"), "0");
        expect(result.eq(0)).toBe(true);
    });
    it("calculates 7% TVA (reduced rate)", () => {
        const result = calcTVA(new Big("500"), "7");
        expect(result.eq(35)).toBe(true);
    });
    it("is exact with Big.js where floats drift (0.1 + 0.2)", () => {
        const ht = new Big("0.1").plus(new Big("0.2"));
        const result = calcTVA(ht, "19");
        // Float arithmetic would give 0.05700000000000001; Big.js gives exactly 0.057.
        expect(result.eq("0.057")).toBe(true);
        expect(result.toString()).toBe("0.057");
    });
    it("returns zero for a zero HT", () => {
        expect(calcTVA(new Big("0"), "19").eq(0)).toBe(true);
    });
});

// --- calcFodec ---

describe("calcFodec", () => {
    it("returns Big(0) when hasFodec is false", () => {
        const result = calcFodec(new Big("1000"), false, "1");
        expect(result.eq(0)).toBe(true);
    });
    it("calculates 1% FODEC", () => {
        const result = calcFodec(new Big("1000"), true, "1");
        expect(result.eq(10)).toBe(true);
    });
    it("calculates FODEC with different rate", () => {
        const result = calcFodec(new Big("2000"), true, "0.5");
        expect(result.eq(10)).toBe(true);
    });
    it("returns zero FODEC on a zero HT", () => {
        expect(calcFodec(new Big("0"), true, "1").eq(0)).toBe(true);
    });
});

// --- calcRetenue ---

describe("calcRetenue", () => {
    it("calculates 1% retenue", () => {
        const result = calcRetenue(new Big("1000"), "1");
        expect(result.eq(10)).toBe(true);
    });
    it("calculates 0% retenue", () => {
        const result = calcRetenue(new Big("1000"), "0");
        expect(result.eq(0)).toBe(true);
    });
    it("calculates 3% retenue", () => {
        const result = calcRetenue(new Big("3000"), "3");
        expect(result.eq(90)).toBe(true);
    });
    it("calculates 100% retenue (full withholding)", () => {
        const result = calcRetenue(new Big("1000"), "100");
        expect(result.eq(1000)).toBe(true);
    });
    it("returns zero retenue on a zero HT", () => {
        expect(calcRetenue(new Big("0"), "1").eq(0)).toBe(true);
    });
});

// --- serializeDecimals ---

describe("serializeDecimals", () => {
    it("returns null for null input", () => {
        expect(serializeDecimals(null)).toBeNull();
    });
    it("returns undefined for undefined input", () => {
        expect(serializeDecimals(undefined)).toBeUndefined();
    });
    it("converts Prisma Decimal-like object to string", () => {
        const mock = { toString: () => "42.5", s: 1, e: 2, d: [4, 2, 5] };
        expect(serializeDecimals(mock)).toBe("42.5");
    });
    it("serializes array of Decimal-like objects", () => {
        const items = [{ toString: () => "10", s: 1, e: 2, d: [1, 0] }, "plain"];
        expect(serializeDecimals(items)).toEqual(["10", "plain"]);
    });
    it("serializes nested object with Decimal fields", () => {
        const dec = { toString: () => "99.9", s: 1, e: 2, d: [9, 9, 9] };
        const input = { total: dec, name: "test", nested: { amount: dec } };
        const result = serializeDecimals(input);
        expect(result).toEqual({ total: "99.9", name: "test", nested: { amount: "99.9" } });
    });
    it("passes through plain strings and numbers", () => {
        expect(serializeDecimals("hello")).toBe("hello");
        expect(serializeDecimals(42)).toBe(42);
    });
    it("converts Date to ISO string", () => {
        const date = new Date("2024-01-15T10:30:00.000Z");
        expect(serializeDecimals(date)).toBe("2024-01-15T10:30:00.000Z");
    });
});
