import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

const supplierInputSchema = z.object({
  supplierId: z.string().min(1, "Fournisseur requis"),
  purchasePrice: z.number().min(0, "Prix d'achat invalide"),
  reference: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});

export const GET = apiRoute.get(
  { permission: "produits:voir" },
  async (_request, { params }) => {
    const { id } = params;

    const suppliers = await prisma.productSupplier.findMany({
      where: { productId: id },
      include: {
        supplier: { select: { id: true, raisonSociale: true } },
      },
      orderBy: { isDefault: "desc" },
    });

    return {
      suppliers: suppliers.map((s) => ({
        id: s.id,
        supplierId: s.supplierId,
        supplierName: s.supplier.raisonSociale,
        purchasePrice: Number(s.purchasePrice),
        salePrice: s.salePrice ? Number(s.salePrice) : null,
        reference: s.reference,
        isDefault: s.isDefault,
      })),
    };
  }
);

export const POST = apiRoute.post(
  { permission: "produits:modifier" },
  async (request, { params }) => {
    const { id } = params;
    const body = await request.json();
    const parsed = supplierInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.issues[0].message),
        { status: 400 }
      );
    }

    const { supplierId, purchasePrice, reference, isDefault } = parsed.data;

    // Vérifier que le produit existe
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json(
        errorResponse("Produit non trouvé"),
        { status: 404 }
      );
    }

    // Vérifier que le fournisseur existe
    const supplier = await prisma.tiers.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json(
        errorResponse("Fournisseur non trouvé"),
        { status: 404 }
      );
    }

    // Vérifier l'unicité produit+fournisseur
    const existing = await prisma.productSupplier.findUnique({
      where: { productId_supplierId: { productId: id, supplierId } },
    });
    if (existing) {
      return NextResponse.json(
        errorResponse("Ce fournisseur est déjà associé à ce produit"),
        { status: 409 }
      );
    }

    // Si isDefault, désactiver les autres defaults
    if (isDefault) {
      await prisma.productSupplier.updateMany({
        where: { productId: id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newSupplier = await prisma.productSupplier.create({
      data: {
        productId: id,
        supplierId,
        purchasePrice,
        reference: reference ?? null,
        isDefault,
      },
      include: {
        supplier: { select: { id: true, raisonSociale: true } },
      },
    });

    return {
      id: newSupplier.id,
      supplierId: newSupplier.supplierId,
      supplierName: newSupplier.supplier.raisonSociale,
      purchasePrice: Number(newSupplier.purchasePrice),
      salePrice: newSupplier.salePrice ? Number(newSupplier.salePrice) : null,
      reference: newSupplier.reference,
      isDefault: newSupplier.isDefault,
    };
  }
);
