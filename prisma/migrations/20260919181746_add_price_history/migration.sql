-- CreateTable
CREATE TABLE "product_supplier_price_history" (
    "id" TEXT NOT NULL,
    "productSupplierId" TEXT NOT NULL,
    "purchasePrice" DECIMAL(19,4) NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,
    "reason" TEXT,

    CONSTRAINT "product_supplier_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_supplier_price_history_productSupplierId_idx" ON "product_supplier_price_history"("productSupplierId");

-- CreateIndex
CREATE INDEX "product_supplier_price_history_changedAt_idx" ON "product_supplier_price_history"("changedAt");

-- AddForeignKey
ALTER TABLE "product_supplier_price_history" ADD CONSTRAINT "product_supplier_price_history_productSupplierId_fkey" FOREIGN KEY ("productSupplierId") REFERENCES "product_suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
