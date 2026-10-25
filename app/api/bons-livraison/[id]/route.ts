import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { apiRoute } from "@/lib/api-route";
import { deliveryNoteStatusUpdateSchema } from "@/lib/schemas/document-updates";
import { handleSaleStockMovement } from "@/lib/stock-utils";

export const GET = apiRoute.get(
  { permission: "bonsLivraison:voir", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const existing = await prisma.bonLivraison.findFirst({
      where: { id, companyId },
      include: {
        tiers: true,
        lines: {
          include: { product: true },
          orderBy: { ordre: "asc" },
        },
        invoices: {
          include: {
            invoice: {
              select: {
                id: true,
                numero: true,
                dateEmission: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(errorResponse("Bon de livraison introuvable"), { status: 404 });
    }

    return { deliveryNote: serializeDecimals(existing) };
  }
);

export const PATCH = apiRoute.patch(
  { permission: "bonsLivraison:modifier", requireCompany: true, schema: deliveryNoteStatusUpdateSchema },
  async (_request, { params, companyId, body }) => {
    const { id } = params;
    const { status } = body;

    const existing = await prisma.bonLivraison.findFirst({
      where: { id, companyId },
      include: { lines: { select: { productId: true, variantId: true, quantite: true } } },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Bon de livraison introuvable"), { status: 404 });
    }

    // Présence ET jeu de valeurs de `status` validés par le Zod du wrapper (422) :
    // les 400 « Statut requis » / « Statut invalide » sont retirés.
    if (status !== existing.status) {
      await handleSaleStockMovement(
        "bl",
        existing.status,
        status,
        existing.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantite: l.quantite.toNumber(),
        })),
        existing.numero,
      );
    }

    const deliveryNote = await prisma.bonLivraison.update({
      where: { id },
      data: { status },
      include: {
        tiers: { select: { raisonSociale: true, ville: true } },
      },
    });

    return { deliveryNote: serializeDecimals(deliveryNote) };
  }
);

export const DELETE = apiRoute.delete(
  { permission: "bonsLivraison:supprimer", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const existing = await prisma.bonLivraison.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Bon de livraison introuvable"), { status: 404 });
    }

    await prisma.bonLivraison.delete({ where: { id } });
    return { success: true };
  }
);
