import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import Big from "big.js";
import { MouvementType, StockStatus } from "@/prisma/generated/prisma/client";
import { apiRoute } from "@/lib/api-route";
import { achatUpdateSchema } from "@/lib/schemas/document-updates";
import { getDefaultSupplierPrice } from "@/lib/stock-utils";

async function recalcAchatStockStatus(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;
  const newStatus: StockStatus =
    product.stockActuel.toNumber() <= 0 ? "RUPTURE"
    : product.stockActuel.toNumber() <= product.stockMinimum.toNumber() ? "CRITIQUE"
    : "OK";
  if (newStatus !== product.stockStatus) {
    await prisma.product.update({ where: { id: productId }, data: { stockStatus: newStatus } });
  }
}

export const GET = apiRoute.get(
  { permission: "achats:voir", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const achat = await prisma.achat.findFirst({
      where: { id, companyId },
      include: {
        tiers: true,
        lines: {
          include: { product: true },
          orderBy: { ordre: "asc" },
        },
        blAchat: {
          select: {
            id: true,
            numero: true,
            type: true,
            status: true,
            totalTTC: true,
            dateFacture: true,
            referenceFournisseur: true,
            tiersId: true,
          },
        },
        facturesLiees: {
          select: {
            id: true,
            numero: true,
            type: true,
            status: true,
            totalTTC: true,
            dateFacture: true,
          },
        },
        payments: true,
      },
    });

    if (!achat) {
      return NextResponse.json(errorResponse("Achat introuvable"), {
        status: 404,
      });
    }

    return { achat: serializeDecimals(achat) };
  }
);

export const PATCH = apiRoute.patch(
  { permission: "achats:modifier", requireCompany: true, schema: achatUpdateSchema },
  async (_request, { params, companyId, body }) => {
    const { id } = params;
    const { status, blAchatId, categorieAchat } = body;

    const existing = await prisma.achat.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Achat introuvable"), { status: 404 });
    }

    // Statut et catégorie sont validés par le Zod du wrapper (422) : les
    // contrôles manuels « Statut invalide » / « Catégorie d'achat invalide »
    // (listes strictement identiques aux enums) sont retirés.

    const isFactureLiee =
      existing.type === "FACTURE" &&
      (existing.blAchatId ?? blAchatId ?? null) !== null;

    // Validation: ENTREE stock
    if (status === "VALIDEE" && existing.status !== "VALIDEE" && !isFactureLiee) {
      const movements = [];
      for (const line of existing.lines) {
        if (!line.productId) continue;

        const supplierInfo = await getDefaultSupplierPrice(line.productId);

        movements.push({
          productId: line.productId,
          type: "ENTREE" as MouvementType,
          quantite: line.quantite.toString(),
          referenceType: "ACHAT" as const,
          referenceId: existing.numero,
          achatId: existing.id,
          supplierId: supplierInfo?.supplierId ?? existing.tiersId,
          purchasePrice: supplierInfo?.purchasePrice?.toString() ?? line.prixAchat?.toString() ?? null,
          date: new Date(),
        });
      }

      if (movements.length > 0) {
        await prisma.stockMovement.createMany({ data: movements });
        for (const m of movements) {
          await prisma.product.update({
            where: { id: m.productId },
            data: { stockActuel: { increment: m.quantite } },
          });
          await recalcAchatStockStatus(m.productId);
        }
      }
    }

    // Annulation: reverse stock (SORTIE)
    if (status === "ANNULEE" && existing.status === "VALIDEE" && !isFactureLiee) {
      const movements = [];
      for (const line of existing.lines) {
        if (!line.productId) continue;

        const supplierInfo = await getDefaultSupplierPrice(line.productId);

        movements.push({
          productId: line.productId,
          type: "SORTIE" as MouvementType,
          quantite: line.quantite.toString(),
          referenceType: "ACHAT" as const,
          referenceId: existing.numero,
          achatId: existing.id,
          supplierId: supplierInfo?.supplierId ?? existing.tiersId,
          purchasePrice: supplierInfo?.purchasePrice?.toString() ?? line.prixAchat?.toString() ?? null,
          date: new Date(),
        });
      }

      if (movements.length > 0) {
        await prisma.stockMovement.createMany({ data: movements });
        for (const m of movements) {
          await prisma.product.update({
            where: { id: m.productId },
            data: { stockActuel: { decrement: m.quantite } },
          });
          await recalcAchatStockStatus(m.productId);
        }
      }
    }

    const achat = await prisma.achat.update({
      where: { id },
      data: {
        status,
        ...(blAchatId !== undefined ? { blAchatId: blAchatId ?? null } : {}),
        ...(categorieAchat !== undefined ? { categorieAchat: categorieAchat ?? null } : {}),
        ...(existing.resteAPayer === null ? { resteAPayer: new Big(existing.totalTTC.toString()).minus(new Big(existing.montantPaye.toString())).toFixed(4) } : {}),
      },
      include: {
        tiers: { select: { raisonSociale: true, ville: true } },
      },
    });

    return { achat: serializeDecimals(achat) };
  }
);

export const DELETE = apiRoute.delete(
  { permission: "achats:supprimer", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const existing = await prisma.achat.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Achat introuvable"), { status: 404 });
    }

    await prisma.achat.delete({ where: { id } });
    return { success: true };
  }
);
