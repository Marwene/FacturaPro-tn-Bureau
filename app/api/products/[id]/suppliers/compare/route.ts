import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";

export const GET = apiRoute.get(
  { permission: "produits:voir" },
  async (_request, { params }) => {
    const { id } = params;

    // Récupérer tous les fournisseurs du produit avec leurs prix
    const suppliers = await prisma.productSupplier.findMany({
      where: { productId: id },
      include: {
        supplier: { select: { id: true, raisonSociale: true } },
      },
      orderBy: { purchasePrice: "asc" },
    });

    if (suppliers.length === 0) {
      return {
        suppliers: [],
        stats: {
          count: 0,
          minPrice: 0,
          maxPrice: 0,
          avgPrice: 0,
          priceRange: 0,
          bestSupplier: null,
        },
      };
    }

    const prices = suppliers.map((s) => Number(s.purchasePrice));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const bestSupplier = suppliers.find(
      (s) => Number(s.purchasePrice) === minPrice
    );

    return {
      suppliers: suppliers.map((s) => ({
        id: s.id,
        supplierId: s.supplier.id,
        supplierName: s.supplier.raisonSociale,
        purchasePrice: Number(s.purchasePrice),
        reference: s.reference,
        isDefault: s.isDefault,
        priceVsAvg: Number(s.purchasePrice) - avgPrice,
        priceVsBest: Number(s.purchasePrice) - minPrice,
      })),
      stats: {
        count: suppliers.length,
        minPrice,
        maxPrice,
        avgPrice: Math.round(avgPrice * 1000) / 1000,
        priceRange: maxPrice - minPrice,
        bestSupplier: bestSupplier
          ? {
              id: bestSupplier.supplier.id,
              name: bestSupplier.supplier.raisonSociale,
              price: minPrice,
            }
          : null,
      },
    };
  }
);
