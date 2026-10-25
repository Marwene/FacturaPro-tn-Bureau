import { describe, it, expect, vi } from "vitest";
import { parseTMM } from "@/lib/tmm-bct";

// lib/tmm-bct.ts imports lib/prisma.ts, which instantiates a PrismaClient at
// import time (needs DATABASE_URL). parseTMM itself is pure, so the prisma
// module is mocked out entirely (vi.mock is hoisted above the imports).
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const page = (rateCell: string): string => `
<html><body>
<table>
  <tr><td>129</td><td>Indice</td><td>Valeur</td></tr>
  <tr><td>Money Market Average Rate (TMM)</td>${rateCell}</tr>
</table>
</body></html>
`;

describe("parseTMM", () => {
    it("extracts a rate within (0, 30)", () => {
        expect(parseTMM(page("<td>6.35</td>"))).toBe(6.35);
    });

    it("accepts a comma decimal separator", () => {
        expect(parseTMM(page("<td>6,35</td>"))).toBe(6.35);
    });

    it("ignores other rows and picks the TMM row", () => {
        const html = `
        <table>
          <tr><td>Some rate</td><td>42.42</td></tr>
          <tr><td>Money Market Average Rate (TMM)</td><td>7.25</td></tr>
        </table>`;
        expect(parseTMM(html)).toBe(7.25);
    });

    it("throws when the rate is out of bounds (>= 30)", () => {
        expect(() => parseTMM(page("<td>35.50</td>"))).toThrow("Could not parse TMM");
    });

    it("throws when the rate is zero", () => {
        expect(() => parseTMM(page("<td>0.00</td>"))).toThrow("Could not parse TMM");
    });

    it("throws when the page has no TMM row", () => {
        expect(() => parseTMM("<html><body><p>maintenance</p></body></html>")).toThrow(
            "Could not parse TMM",
        );
    });
});
