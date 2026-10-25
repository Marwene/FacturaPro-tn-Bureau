import { prisma } from "@/lib/prisma";
import { Prisma, StockStatus } from "@/prisma/generated/prisma/client";

/**
 * Récupère le prix d'achat du fournisseur par défaut pour un produit.
 * Retourne le supplierId et le purchasePrice du ProductSupplier marqué isDefault=true.
 */
export async function getDefaultSupplierPrice(
  productId: string,
  tx?: Prisma.TransactionClient
): Promise<{ supplierId: string; purchasePrice: number } | null> {
  const client = tx ?? prisma;
  const supplier = await client.productSupplier.findFirst({
    where: { productId, isDefault: true, actif: true },
    select: { supplierId: true, purchasePrice: true },
  });
  return supplier
    ? { supplierId: supplier.supplierId, purchasePrice: Number(supplier.purchasePrice) }
    : null;
}

const CONFIRMED_STATUSES: Record<string, Set<string>> = {
    invoice: new Set(["ENVOYEE", "PAYEE", "PARTIELLE", "EN_RETARD"]),
    bl: new Set(["LIVRE"]),
};

const ANNULLED_STATUSES: Record<string, Set<string>> = {
    invoice: new Set(["ANNULEE"]),
    bl: new Set(["ANNULE"]),
};

interface LineInfo {
    productId: string | null;
    variantId?: string | null;
    quantite: number;
}

async function recalculateStockStatus(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return;

    const currentStock = product.stockActuel.toNumber();
    const minStock = product.stockMinimum.toNumber();

    // For made-to-order products: stock=1 is the permanent sample floor, treat as OK
    const effectiveStock =
        product.estSurCommande && currentStock <= 1
            ? Math.max(currentStock, 2)
            : currentStock;

    const stockStatus: StockStatus =
        currentStock <= 0
            ? "RUPTURE"
            : effectiveStock <= minStock
                ? "CRITIQUE"
                : "OK";

    if (stockStatus !== product.stockStatus) {
        await prisma.product.update({
            where: { id: productId },
            data: { stockStatus },
        });
    }
}

async function recalculateStockStatusTx(tx: Prisma.TransactionClient, productId: string) {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) return;

    const currentStock = product.stockActuel.toNumber();
    const minStock = product.stockMinimum.toNumber();

    // For made-to-order products: stock=1 is the permanent sample floor, treat as OK
    const effectiveStock =
        product.estSurCommande && currentStock <= 1
            ? Math.max(currentStock, 2)
            : currentStock;

    const stockStatus: StockStatus =
        currentStock <= 0
            ? "RUPTURE"
            : effectiveStock <= minStock
                ? "CRITIQUE"
                : "OK";

    if (stockStatus !== product.stockStatus) {
        await tx.product.update({
            where: { id: productId },
            data: { stockStatus },
        });
    }
}

export async function handleSaleStockMovement(
    docType: "invoice" | "bl",
    existingStatus: string,
    newStatus: string,
    lines: LineInfo[],
    referenceId: string
) {
    const confirmed = CONFIRMED_STATUSES[docType];
    const annulled = ANNULLED_STATUSES[docType];
    const wasConfirmed = confirmed.has(existingStatus);
    const isConfirmed = confirmed.has(newStatus);
    const isAnnulled = annulled.has(newStatus);

    const productUpdates = new Map<string, number>();

    if (isConfirmed && !wasConfirmed) {
        for (const line of lines) {
            if (!line.productId) continue;
            const qty = line.quantite;
            productUpdates.set(line.productId, (productUpdates.get(line.productId) ?? 0) - qty);
        }
    }

    if (isAnnulled && wasConfirmed) {
        for (const line of lines) {
            if (!line.productId) continue;
            const qty = line.quantite;
            productUpdates.set(line.productId, (productUpdates.get(line.productId) ?? 0) + qty);
        }
    }

    if (productUpdates.size === 0) return;

    await prisma.$transaction(async (tx) => {
        if (isConfirmed && !wasConfirmed) {
            for (const line of lines) {
                if (!line.productId) continue;
                await tx.stockMovement.create({
                    data: {
                        productId: line.productId,
                        variantId: line.variantId ?? null,
                        type: "SORTIE",
                        quantite: String(line.quantite),
                        referenceType: "VENTE",
                        referenceId,
                        date: new Date(),
                        notes: `${docType === "invoice" ? "Facture" : "BL"} ${referenceId}`,
                    },
                });
            }
        }

        if (isAnnulled && wasConfirmed) {
            for (const line of lines) {
                if (!line.productId) continue;
                await tx.stockMovement.create({
                    data: {
                        productId: line.productId,
                        variantId: line.variantId ?? null,
                        type: "ENTREE",
                        quantite: String(line.quantite),
                        referenceType: "VENTE",
                        referenceId,
                        date: new Date(),
                        notes: `Annulation ${docType === "invoice" ? "facture" : "BL"} ${referenceId}`,
                    },
                });
            }
        }

        for (const [productId, delta] of productUpdates) {
            if (delta !== 0) {
                // Fetch product to check estSurCommande status
                const product = await tx.product.findUnique({
                    where: { id: productId },
                    select: { estSurCommande: true, stockActuel: true },
                });
                if (!product) continue;

                let effectiveDelta = delta;
                if (product.estSurCommande && delta < 0) {
                    // For made-to-order: stock must not go below 1 (permanent sample)
                    const newStock = product.stockActuel.toNumber() + delta;
                    if (newStock < 1) {
                        effectiveDelta = 1 - product.stockActuel.toNumber();
                        // If effectiveDelta is 0 or positive, already at floor — skip
                        if (effectiveDelta >= 0) continue;
                    }
                }

                await tx.product.update({
                    where: { id: productId },
                    data: { stockActuel: { increment: effectiveDelta } },
                });
                await recalculateStockStatusTx(tx, productId);
            }
        }
    });
}
