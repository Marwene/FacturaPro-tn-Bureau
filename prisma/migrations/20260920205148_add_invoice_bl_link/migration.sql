-- AlterEnum
ALTER TYPE "BonLivraisonStatus" ADD VALUE 'FACTURE';

-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN     "bonLivraisonId" TEXT;

-- CreateTable
CREATE TABLE "invoice_bons_livraison" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "bonLivraisonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_bons_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_bons_livraison_invoiceId_bonLivraisonId_key" ON "invoice_bons_livraison"("invoiceId", "bonLivraisonId");

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_bonLivraisonId_fkey" FOREIGN KEY ("bonLivraisonId") REFERENCES "bons_livraison"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_bons_livraison" ADD CONSTRAINT "invoice_bons_livraison_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_bons_livraison" ADD CONSTRAINT "invoice_bons_livraison_bonLivraisonId_fkey" FOREIGN KEY ("bonLivraisonId") REFERENCES "bons_livraison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
