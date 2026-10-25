import Big from "big.js";

// Prisma Decimal class — declared here for type use only
declare class Decimal {
    toString(): string;
    toNumber(): number;
    s: number;
    e: number;
    d: number[];
}

/**
 * Serialize a Prisma Decimal to a plain string for safe JSON transport.
 * Always call this in Server Components / API Routes before sending to client.
 */
export function serializeDecimal(value: Decimal | null | undefined): string {
    if (value === null || value === undefined) return "0";
    return String(value);
}

/**
 * Deserialize a string back to a Big.js instance on the client side.
 * Use this wherever you need arithmetic on received decimal strings.
 */
export function deserializeDecimal(value: string | null | undefined): Big {
    if (!value) return new Big(0);
    try {
        return new Big(value);
    } catch {
        return new Big(0);
    }
}

/**
 * Format a decimal string / Big instance as Tunisian Dinar
 * e.g. 1234.567 → "1 234,567 DT"
 */
export function formatTND(value: string | Big | number | null | undefined): string {
    return formatCurrency(value, "TND");
}

const DEVISE_SYMBOLS: Record<string, { symbol: string; prefix: boolean }> = {
    TND: { symbol: " DT", prefix: false },
    EUR: { symbol: "€", prefix: false },
    USD: { symbol: "$", prefix: true },
};

/**
 * Format a decimal string / Big instance with the given devise
 * e.g. 1234.567 with TND → "1 234,567 DT"
 * e.g. 1234.567 with EUR → "1 234,567 €"
 * e.g. 1234.567 with USD → "$1,234.567"
 */
export function formatCurrency(
    value: string | Big | number | null | undefined,
    devise: string = "TND"
): string {
    const known = DEVISE_SYMBOLS[devise];
    const fmt = known ?? DEVISE_SYMBOLS.TND;
    // TND and unknown devies fall back to 3 decimals; other known devies use 2.
    const decimals = known !== undefined && devise !== "TND" ? 2 : 3;
    // Zero placeholder matching the devise decimals ("0,000" for TND/unknown, "0,00" otherwise).
    const zero = decimals === 3 ? "0,000" : "0,00";
    if (value === null || value === undefined || value === "") {
        return fmt.prefix ? `${fmt.symbol}0,000` : `0,000${fmt.symbol}`;
    }
    let num: Big;
    try {
        num = value instanceof Big ? value : new Big(String(value));
    } catch {
        return fmt.prefix ? `${fmt.symbol}${zero}` : `${zero}${fmt.symbol}`;
    }
    if (devise === "USD") {
        const parts = num.toFixed(decimals).split(".");
        const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return fmt.prefix ? `${fmt.symbol}${intPart}.${parts[1]}` : `${intPart}.${parts[1]}${fmt.symbol}`;
    }
    const parts = num.toFixed(decimals).split(".");
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
    return fmt.prefix ? `${fmt.symbol}${intPart},${parts[1]}` : `${intPart},${parts[1]}${fmt.symbol}`;
}

/**
 * Format with TND grouping (U+00A0) and 3 decimals but WITHOUT the currency
 * symbol — for contexts where the surrounding copy already carries the unit
 * (signed prefixes "+…"/"-…", inline breakdowns separated by "·").
 * e.g. 1234.567 → "1 234,567"
 */
export function formatTNDNumber(value: string | Big | number | null | undefined): string {
    return formatNumeric(value, 3);
}

/**
 * Compact TND format without the currency symbol — for chart axis ticks.
 * e.g. 1234567 → "1 234 567"
 */
export function formatTNDShort(value: string | Big | number | null | undefined): string {
    return formatNumeric(value, 0);
}

function formatNumeric(value: string | Big | number | null | undefined, decimals: number): string {
    const zero = decimals === 3 ? "0,000" : "0";
    if (value === null || value === undefined || value === "") return zero;
    let num: Big;
    try {
        num = value instanceof Big ? value : new Big(String(value));
    } catch {
        return zero;
    }
    const fixed = num.toFixed(decimals);
    if (decimals === 0) {
        return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
    }
    const parts = fixed.split(".");
    return `${parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")},${parts[1]}`;
}

/**
 * Format a decimal string as a percentage
 */
export function formatPercent(value: string | Big | number | null | undefined): string {
    if (value === null || value === undefined || value === "") return "0%";
    let num: Big;
    try {
        num = value instanceof Big ? value : new Big(String(value));
    } catch {
        return "0%";
    }
    return `${num.toFixed(1)}%`;
}

/**
 * Deep-serialize all Prisma Decimal fields in an object to strings.
 * Handles nested objects and arrays.
 */
export function serializeDecimals<T>(obj: T): SerializedDecimals<T> {
    if (obj === null || obj === undefined) return obj as SerializedDecimals<T>;

    // Catch Prisma Decimal-like objects (has s, e, d internal props + toString)
    if (typeof obj === "object" && "s" in obj && "e" in obj && "d" in obj && typeof (obj as { toString: unknown }).toString === "function") {
        return obj.toString() as SerializedDecimals<T>;
    }

    if (Array.isArray(obj)) {
        return obj.map(serializeDecimals) as SerializedDecimals<T>;
    }

    if (obj instanceof Date) {
        return obj.toISOString() as SerializedDecimals<T>;
    }

    if (typeof obj === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            result[key] = serializeDecimals(value);
        }
        return result as SerializedDecimals<T>;
    }

    return obj as SerializedDecimals<T>;
}

// Type helper: replace Decimal fields with string recursively
type SerializedDecimals<T> = T extends Decimal
    ? string
    : T extends Array<infer U>
    ? Array<SerializedDecimals<U>>
    : T extends object
    ? { [K in keyof T]: SerializedDecimals<T[K]> }
    : T;

/**
 * Normalize a Tunisian-format number string to JavaScript format.
 * Examples:
 *   "1.500"  → "1500"    (dot = thousands separator)
 *   "30.00"  → "30.00"   (last dot = decimal separator)
 *   "1,5"    → "1.5"     (comma = decimal separator)
 *   "1.500,5" → "1500.5" (mixed format)
 */
export function parseTunisianNumber(input: string): number {
    let s = input.trim().replace(/\s/g, "");
    if (!s) return 0;
    if (s.includes(",")) {
        s = s.replace(/\./g, "").replace(",", ".");
        return parseFloat(s) || 0;
    }
    const groups = s.split(".");
    // TN convention (see JSDoc): a dot followed by exactly 3 digits is a
    // thousands separator — "1.500" → 1500, "12.345.678" → 12345678.
    // When every group after the first has exactly 3 digits, all dots are
    // grouping separators; otherwise the last dot stays the decimal separator
    // ("30.00" → 30, "123.45" → 123.45, "1.5" → 1.5).
    const groupedByThousands =
        groups.length > 1 &&
        /^-?\d+$/.test(groups[0]) &&
        groups.slice(1).every((g) => /^\d{3}$/.test(g));
    if (groupedByThousands) {
        return parseFloat(groups.join("")) || 0;
    }
    const lastDot = s.lastIndexOf(".");
    if (lastDot >= 0) {
        const after = s.slice(lastDot + 1);
        const dotCount = groups.length - 1;
        if (dotCount === 1 && /^\d+$/.test(after)) {
            // Single dot that is not a thousands grouping: decimal separator.
            return parseFloat(s) || 0;
        }
        if (after.length >= 2 && after.length <= 3 && /^\d+$/.test(after)) {
            s = s.slice(0, lastDot).replace(/\./g, "") + "." + after;
            return parseFloat(s) || 0;
        }
        s = s.replace(/\./g, "");
    }
    return parseFloat(s) || 0;
}

/**
 * Calculate invoice line total HT
 */
export function calcLineHT(
    quantite: string,
    prixHT: string,
    remise: string
): Big {
    const qty = deserializeDecimal(quantite);
    const prix = deserializeDecimal(prixHT);
    const rem = deserializeDecimal(remise);
    const remiseFactor = new Big(1).minus(rem.div(100));
    return qty.times(prix).times(remiseFactor);
}

/**
 * Calculate TVA amount from HT
 */
export function calcTVA(totalHT: Big, tauxTVA: string): Big {
    return totalHT.times(deserializeDecimal(tauxTVA)).div(100);
}

/**
 * Calculate FODEC amount from HT
 */
export function calcFodec(totalHT: Big, hasFodec: boolean, tauxFodec: string): Big {
    if (!hasFodec) return new Big(0);
    return totalHT.times(deserializeDecimal(tauxFodec)).div(100);
}

/**
 * Calculate retenue at source
 */
export function calcRetenue(totalHT: Big, tauxRetenue: string): Big {
    return totalHT.times(deserializeDecimal(tauxRetenue)).div(100);
}
