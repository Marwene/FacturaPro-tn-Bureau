import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { serializeDecimals } from "@/lib/decimal";
import type { BonLivraison, BonLivraisonLine, Tiers, Product } from "@/prisma/generated/prisma/client";

type BLWithRelations = BonLivraison & {
  tiers: Pick<Tiers, "id" | "raisonSociale" | "matriculeFiscal" | "adresse" | "ville">;
  lines: (BonLivraisonLine & {
    product: Pick<Product, "id" | "code" | "nom"> | null;
  })[];
};

interface ClientGroup {
  clientId: string;
  clientName: string;
  blCount: number;
  totalTTC: number;
  bls: BLWithRelations[];
}

export const GET = apiRoute.get(
  { permission: "factures:voir", requireCompany: true },
  async (_request, { companyId }) => {
    const pendingBLs: BLWithRelations[] = await prisma.bonLivraison.findMany({
      where: {
        status: "LIVRE",
        companyId,
        invoices: { none: {} },
      },
      include: {
        tiers: {
          select: {
            id: true,
            raisonSociale: true,
            matriculeFiscal: true,
            adresse: true,
            ville: true,
          },
        },
        lines: {
          include: {
            product: {
              select: { id: true, code: true, nom: true },
            },
          },
          orderBy: { ordre: "asc" },
        },
      },
      orderBy: { dateLivraison: "asc" },
    });

    const groupedByClient = new Map<string, ClientGroup>();

    for (const bl of pendingBLs) {
      const clientId = bl.tiersId;
      const existing = groupedByClient.get(clientId);
      if (existing) {
        existing.blCount++;
        existing.totalTTC += Number(bl.totalTTC);
        existing.bls.push(bl);
      } else {
        groupedByClient.set(clientId, {
          clientId,
          clientName: bl.tiers.raisonSociale,
          blCount: 1,
          totalTTC: Number(bl.totalTTC),
          bls: [bl],
        });
      }
    }

    return serializeDecimals({
      clients: Array.from(groupedByClient.values()),
      totalBLs: pendingBLs.length,
    });
  }
);
