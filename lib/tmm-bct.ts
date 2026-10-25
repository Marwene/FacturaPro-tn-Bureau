import { prisma } from "@/lib/prisma";
import { serializeDecimal } from "@/lib/decimal";

const BCT_TMM_URL = "https://www.bct.gov.tn/bct/siteprod/stat_page.jsp?id=129&la=an";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface TMMResult {
    tmm: string;
    date: string;
    source: "cache" | "BCT";
}

export function parseTMM(html: string): number {
    const rows = html.split(/<\s*tr\b/i);
    for (const row of rows) {
        if (/money market average rate\s*\(tmm\)/i.test(row)) {
            const match = row.match(/\d+[.,]\d+/);
            if (match) {
                const value = parseFloat(match[0].replace(",", "."));
                if (value > 0 && value < 30) return value;
            }
        }
    }
    throw new Error("Could not parse TMM");
}

async function fetchTMMFromBCT(): Promise<string> {
    const res = await fetch(BCT_TMM_URL, {
        headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`BCT returned ${res.status}`);
    const html = await res.text();
    return parseTMM(html).toFixed(2);
}

async function storeTMM(tmm: string): Promise<{ tmm: string; date: Date }> {
    const now = new Date();
    let settings = await prisma.appSettings.findFirst();
    if (!settings) {
        settings = await prisma.appSettings.create({ data: {} });
    }
    await prisma.appSettings.update({
        where: { id: settings.id },
        data: { tmmTaux: tmm, tmmMajLe: now },
    });
    return { tmm, date: now };
}

export async function getTMM(): Promise<TMMResult> {
    const settings = await prisma.appSettings.findFirst();
    const cached = settings?.tmmTaux ?? null;
    const cachedDate = settings?.tmmMajLe ?? null;

    if (cached !== null && cachedDate !== null) {
        const age = Date.now() - cachedDate.getTime();
        if (age < CACHE_MAX_AGE_MS) {
            return { tmm: serializeDecimal(cached), date: cachedDate.toISOString(), source: "cache" };
        }
    }

    try {
        const tmm = await fetchTMMFromBCT();
        const { tmm: stored, date } = await storeTMM(tmm);
        return { tmm: stored, date: date.toISOString(), source: "BCT" };
    } catch (err) {
        if (cached !== null && cachedDate !== null) {
            return { tmm: serializeDecimal(cached), date: cachedDate.toISOString(), source: "cache" };
        }
        throw err;
    }
}

export async function refreshTMM(): Promise<TMMResult> {
    const tmm = await fetchTMMFromBCT();
    const { tmm: stored, date } = await storeTMM(tmm);
    return { tmm: stored, date: date.toISOString(), source: "BCT" };
}