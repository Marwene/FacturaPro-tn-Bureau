-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "achatId" TEXT;

-- CreateIndex
CREATE INDEX "payments_achatId_idx" ON "payments"("achatId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES "achats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
