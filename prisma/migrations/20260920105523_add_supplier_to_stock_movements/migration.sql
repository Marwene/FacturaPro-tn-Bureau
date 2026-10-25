-- AlterTable
ALTER TABLE "mouvements_stock" ADD COLUMN     "purchasePrice" DECIMAL(19,4),
ADD COLUMN     "supplierId" TEXT;

-- CreateIndex
CREATE INDEX "mouvements_stock_supplierId_idx" ON "mouvements_stock"("supplierId");

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
