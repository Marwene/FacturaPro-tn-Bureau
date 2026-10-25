import { prisma } from "@/lib/prisma";

/**
 * Atomically generate the next number for a given sequence (e.g. invoice, quote).
 * Uses PostgreSQL upsert to prevent race conditions under concurrent requests.
 *
 * @param name - Sequence name (e.g. "invoice", "quote")
 * @param prefix - Document prefix (e.g. "FAC", "DEV")
 * @param companyId - The ID of the company
 * @returns Formatted number like "FAC-2026-0001"
 */
export async function nextNumber(name: string, prefix: string, companyId: string): Promise<string> {
  const year = new Date().getFullYear();

  const sequence = await prisma.sequence.upsert({
    where: {
      name_year_companyId: { name, year, companyId },
    },
    update: {
      lastValue: { increment: 1 },
    },
    create: {
      name,
      year,
      companyId,
      lastValue: 1,
    },
  });

  return `${prefix}-${year}-${String(sequence.lastValue).padStart(4, "0")}`;
}
