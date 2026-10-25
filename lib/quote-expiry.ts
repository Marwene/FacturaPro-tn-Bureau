import type { PrismaClient } from "@/prisma/generated/prisma/client";

/**
 * Expiration automatique des devis (write-on-read).
 *
 * Prédicat verbatim de POST /api/quotes/expire :
 * statuts ENVOYEE/BROUILLON avec dateExpiration <= now → EXPIREE.
 * Appelé en tête des GET qui lisent l'état des devis (liste, détail, dashboard)
 * pour que la lecture voie toujours un état frais, sans requête cliente dédiée.
 *
 * @param db client Prisma (injecté pour rester testable/réutilisable)
 * @param companyId périmètre multi-tenant
 * @returns nombre de devis expirés par cet appel
 */
export async function expireDueQuotes(
  db: PrismaClient,
  companyId: string
): Promise<number> {
  const result = await db.quote.updateMany({
    where: {
      companyId,
      status: { in: ["ENVOYEE", "BROUILLON"] },
      dateExpiration: { lte: new Date() },
    },
    data: { status: "EXPIREE" },
  });

  return result.count;
}
