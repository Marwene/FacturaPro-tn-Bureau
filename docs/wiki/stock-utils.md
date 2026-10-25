# stock-utils

## Purpose

Centralizes stock movement logic: decrementing/incrementing product stock on document status changes, recalculating stock status labels, and enforcing business rules (e.g., made-to-order floor).

## Key Files

- `lib/stock-utils.ts` — all stock logic lives here

## Functions

### `getDefaultSupplierPrice(productId, tx?)`

Retrieves the default supplier's purchase price for a given product. Queries `ProductSupplier` where `isDefault=true` and `actif=true`. Returns `{ supplierId, purchasePrice }` or `null` if no default supplier exists. Accepts an optional Prisma transaction client for use within `$transaction` blocks.

Used by:
- `app/api/achats/[id]/route.ts` — when creating stock movements on achat validation/cancellation
- `app/api/products/[id]/stock-movements/route.ts` — manual stock entries

### `handleSaleStockMovement(docType, existingStatus, newStatus, lines, referenceId)`

Orchestrates stock changes when an invoice or bon de livraison changes status:

1. **Confirmed → stock decremented**: when a document transitions to a confirmed status (ENVOYEE/PAYEE/PARTIELLE/EN_RETARD for invoices, LIVRE for BLs), stock is decremented by line quantities.
2. **Annulled → stock restored**: when a confirmed document is annulled (ANNULEE/ANNULE), stock is restored.
3. **Made-to-order floor**: for `estSurCommande` products, stock never goes below 1 (permanent sample).
4. Creates `StockMovement` records (SORTIE/ENTREE) for audit trail.
5. Runs inside a Prisma transaction.

### `recalculateStockStatus(productId)`

Standalone function (not currently called). Computes stock status based on current stock vs. minimum.

### `recalculateStockStatusTx(tx, productId)`

Transaction-scoped version of the above. Called after each stock update within `handleSaleStockMovement`.

## Business Rules

- **estSurCommande floor = 1**: made-to-order products always retain 1 unit (permanent sample). Stock=1 is treated as OK, not CRITIQUE.
- **Stock statuses**: RUPTURE (≤0), CRITIQUE (≤stockMinimum), OK (above minimum).

## Dependencies

- `@/lib/prisma` — Prisma client
- `@/prisma/generated/prisma/client` — `Prisma.TransactionClient`, `StockStatus` enum
