import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = apiRoute.get(
  { permission: "produits:voir" },
  async (_request, { params }) => {
    const { id, supplierId } = params;

    const productSupplier = await prisma.productSupplier.findUnique({
      where: { id: supplierId },
      include: {
        supplier: { select: { id: true, raisonSociale: true } },
      },
    });

    if (!productSupplier || productSupplier.productId !== id) {
      return NextResponse.json(
        { message: "Association produit-fournisseur non trouvée" },
        { status: 404 }
      );
    }

    const history = await prisma.productSupplierPriceHistory.findMany({
      where: { productSupplierId: supplierId },
      orderBy: { changedAt: "desc" },
      take: 50,
    });

    return {
      supplier: {
        id: productSupplier.supplier.id,
        name: productSupplier.supplier.raisonSociale,
        currentPrice: Number(productSupplier.purchasePrice),
        reference: productSupplier.reference,
      },
      history: history.map((h) => ({
        id: h.id,
        purchasePrice: Number(h.purchasePrice),
        changedAt: h.changedAt.toISOString(),
        changedBy: h.changedBy,
        reason: h.reason,
      })),
    };
  }
);
