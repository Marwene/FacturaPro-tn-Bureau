-- AlterTable
ALTER TABLE "bons_livraison" ADD COLUMN     "quoteId" TEXT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "bonLivraisonId" TEXT;

-- CreateIndex
CREATE INDEX "bons_livraison_quoteId_idx" ON "bons_livraison"("quoteId");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison" ADD CONSTRAINT "bons_livraison_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
