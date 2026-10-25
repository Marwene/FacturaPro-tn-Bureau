import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSupplierSchema = z.object({
  purchasePrice: z.number().min(0, "Prix d'achat invalide").optional(),
  reference: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const PUT = apiRoute.put(
  { permission: "produits:modifier" },
  async (request, { params, session }) => {
    const { id, supplierId } = params;
    const body = await request.json();
    const parsed = updateSupplierSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    const existing = await prisma.productSupplier.findUnique({
      where: { id: supplierId },
    });
    if (!existing || existing.productId !== id) {
      return NextResponse.json(
        errorResponse("Association non trouvée"),
        { status: 404 }
      );
    }

    const { purchasePrice, reference, isDefault } = parsed.data;

    // Si le prix change, enregistrer l'historique AVANT la mise à jour
    if (purchasePrice !== undefined && purchasePrice !== Number(existing.purchasePrice)) {
      await prisma.productSupplierPriceHistory.create({
        data: {
          productSupplierId: existing.id,
          purchasePrice: existing.purchasePrice,
          changedBy: session.id,
          reason: "Mise à jour manuelle",
        },
      });
    }

    // Si isDefault, désactiver les autres defaults
    if (isDefault) {
      await prisma.productSupplier.updateMany({
        where: {
          productId: id,
          isDefault: true,
          id: { not: supplierId },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.productSupplier.update({
      where: { id: supplierId },
      data: {
        ...(purchasePrice !== undefined && { purchasePrice }),
        ...(reference !== undefined && { reference }),
        ...(isDefault !== undefined && { isDefault }),
      },
      include: {
        supplier: { select: { id: true, raisonSociale: true } },
      },
    });

    return {
      id: updated.id,
      supplierId: updated.supplierId,
      supplierName: updated.supplier.raisonSociale,
      purchasePrice: Number(updated.purchasePrice),
      salePrice: updated.salePrice ? Number(updated.salePrice) : null,
      reference: updated.reference,
      isDefault: updated.isDefault,
    };
  }
);

export const DELETE = apiRoute.delete(
  { permission: "produits:supprimer" },
  async (_request, { params }) => {
    const { id, supplierId } = params;

    const existing = await prisma.productSupplier.findUnique({
      where: { id: supplierId },
    });
    if (!existing || existing.productId !== id) {
      return NextResponse.json(
        errorResponse("Association non trouvée"),
        { status: 404 }
      );
    }

    await prisma.productSupplier.delete({ where: { id: supplierId } });

    return { success: true };
  }
);
