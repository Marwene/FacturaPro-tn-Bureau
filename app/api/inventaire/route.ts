import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { apiRoute } from "@/lib/api-route";

export const GET = apiRoute.get(
  { permission: "produits:voir", requireCompany: false },
  async (request) => {
    const { searchParams } = new URL(request.url);
    const periode = parseInt(searchParams.get("periode") ?? "30", 10);

    const since = new Date();
    since.setDate(since.getDate() - periode);

    const [products, totalCount, mouvementStats, recentMovements] = await Promise.all([
      prisma.product.findMany({
        where: { actif: true },
        select: {
          id: true,
          code: true,
          nom: true,
          prixHT: true,
          stockActuel: true,
          stockMinimum: true,
          stockStatus: true,
          categorie: { select: { id: true, nom: true } },
          variants: {
            where: { actif: true },
            select: {
              id: true,
              prixHT: true,
              stockActuel: true,
            },
          },
        },
        orderBy: { stockActuel: "desc" },
      }),
      prisma.product.count({ where: { actif: true } }),
      prisma.stockMovement.groupBy({
        by: ["type"],
        where: { date: { gte: since } },
        _count: { id: true },
        _sum: { quantite: true },
      }),
      prisma.stockMovement.findMany({
        where: { date: { gte: since } },
        orderBy: { date: "desc" },
        take: 10,
        include: {
          product: { select: { id: true, code: true, nom: true } },
        },
      }),
    ]);

    const valeurStock = products.reduce((acc, p) => {
      const parentStock = Number(p.prixHT) * Number(p.stockActuel);
      const variantStock = (p.variants ?? []).reduce(
        (vAcc, v) => vAcc + Number(v.prixHT ?? p.prixHT) * Number(v.stockActuel),
        0
      );
      return acc + parentStock + variantStock;
    }, 0);

    const alerts = products.filter((p) => p.stockStatus === "CRITIQUE");
    const ruptures = products.filter((p) => p.stockStatus === "RUPTURE");

    const categoryData = products.reduce<
      Record<string, { nom: string; count: number; valeur: number }>
    >((acc, p) => {
      const catId = p.categorie?.id ?? "sans";
      const catName = p.categorie?.nom ?? "Sans catégorie";
      if (!acc[catId]) acc[catId] = { nom: catName, count: 0, valeur: 0 };
      acc[catId].count++;
      const parentValeur = Number(p.prixHT) * Number(p.stockActuel);
      const variantValeur = (p.variants ?? []).reduce(
        (vAcc, v) => vAcc + Number(v.prixHT ?? p.prixHT) * Number(v.stockActuel),
        0
      );
      acc[catId].valeur += parentValeur + variantValeur;
      return acc;
    }, {});

    const topProducts = products
      .map((p) => {
        const parentValeur = Number(p.prixHT) * Number(p.stockActuel);
        const variantValeur = (p.variants ?? []).reduce(
          (vAcc, v) => vAcc + Number(v.prixHT ?? p.prixHT) * Number(v.stockActuel),
          0
        );
        return {
          id: p.id,
          code: p.code,
          nom: p.nom,
          stockActuel:
            Number(p.stockActuel) +
            (p.variants ?? []).reduce((s, v) => s + Number(v.stockActuel), 0),
          stockMinimum: Number(p.stockMinimum),
          stockStatus: p.stockStatus,
          valeur: parentValeur + variantValeur,
          prixHT: Number(p.prixHT),
          categorie: p.categorie?.nom ?? null,
        };
      })
      .sort((a, b) => b.valeur - a.valeur)
      .slice(0, 10);

    const entreeStats = mouvementStats.find((m) => m.type === "ENTREE");
    const sortieStats = mouvementStats.find((m) => m.type === "SORTIE");
    const ajustementStats = mouvementStats.find((m) => m.type === "AJUSTEMENT");

    return {
      stats: {
        totalProduits: totalCount,
        valeurStock: valeurStock.toFixed(3),
        alertesCount: alerts.length,
        rupturesCount: ruptures.length,
        mouvementsEntree: entreeStats?._count.id ?? 0,
        mouvementsSortie: sortieStats?._count.id ?? 0,
        mouvementsAjustement: ajustementStats?._count.id ?? 0,
        periode,
      },
      categories: Object.entries(categoryData).map(([id, data]) => ({
        id,
        nom: data.nom,
        count: data.count,
        valeur: data.valeur.toFixed(3),
      })),
      topProduits: topProducts,
      produitsAlerte: alerts.slice(0, 5).map((p) => ({
        id: p.id,
        code: p.code,
        nom: p.nom,
        stockActuel: Number(p.stockActuel),
        stockMinimum: Number(p.stockMinimum),
        stockStatus: p.stockStatus,
        categorie: p.categorie?.nom ?? null,
      })),
      mouvementsRecents: serializeDecimals(recentMovements),
    };
  }
);
