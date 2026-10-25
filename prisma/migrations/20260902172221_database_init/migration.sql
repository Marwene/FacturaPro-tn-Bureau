/*
  Warnings:

  - The values [CHEQUE,EFFET] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[paymentId]` on the table `cheques` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymentId]` on the table `effets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chequeId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[effetId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('ESPECES', 'VIREMENT', 'CARTE');
ALTER TABLE "payments" ALTER COLUMN "methode" TYPE "PaymentMethod_new" USING ("methode"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- AlterTable
ALTER TABLE "cheques" ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "effets" ADD COLUMN     "paymentId" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "chequeId" TEXT,
ADD COLUMN     "effetId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cheques_paymentId_key" ON "cheques"("paymentId");

-- CreateIndex
CREATE INDEX "cheques_paymentId_idx" ON "cheques"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "effets_paymentId_key" ON "effets"("paymentId");

-- CreateIndex
CREATE INDEX "effets_paymentId_idx" ON "effets"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_chequeId_key" ON "payments"("chequeId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_effetId_key" ON "payments"("effetId");

-- CreateIndex
CREATE INDEX "payments_chequeId_idx" ON "payments"("chequeId");

-- CreateIndex
CREATE INDEX "payments_effetId_idx" ON "payments"("effetId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "cheques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_effetId_fkey" FOREIGN KEY ("effetId") REFERENCES "effets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
