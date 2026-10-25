-- CreateEnum
CREATE TYPE "SensMouvement" AS ENUM ('ENCAISSEMENT', 'DECAISSEMENT', 'A_QUALIFIER');

-- CreateEnum
CREATE TYPE "ModeReglement" AS ENUM ('ESPECES', 'CHEQUE', 'VIREMENT', 'EFFET', 'CARTE');

-- CreateEnum
CREATE TYPE "StatutMouvement" AS ENUM ('PREVU', 'REALISE', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeCompte" AS ENUM ('CAISSE', 'BANQUE');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'EFFET';

-- CreateTable
CREATE TABLE "comptes_tresorerie" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "TypeCompte" NOT NULL,
    "libelle" TEXT NOT NULL,
    "companyBankAccountId" TEXT,
    "soldeInitial" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "dateSoldeInitial" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comptes_tresorerie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_tresorerie" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "compteId" TEXT NOT NULL,
    "sens" "SensMouvement" NOT NULL,
    "mode" "ModeReglement" NOT NULL,
    "statut" "StatutMouvement" NOT NULL,
    "montant" DECIMAL(19,4) NOT NULL,
    "devise" TEXT NOT NULL DEFAULT 'TND',
    "montantTND" DECIMAL(19,4),
    "dateOperation" TIMESTAMP(3) NOT NULL,
    "dateValeur" TIMESTAMP(3),
    "dateEcheance" TIMESTAMP(3),
    "tiersId" TEXT,
    "invoiceId" TEXT,
    "achatId" TEXT,
    "avoirId" TEXT,
    "chequeId" TEXT,
    "effetId" TEXT,
    "paymentId" TEXT,
    "mouvementFinancierId" TEXT,
    "libelle" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "annuleParId" TEXT,
    "annuleLe" TIMESTAMP(3),
    "cleSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mouvements_tresorerie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comptes_tresorerie_companyBankAccountId_idx" ON "comptes_tresorerie"("companyBankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "comptes_tresorerie_companyId_type_key" ON "comptes_tresorerie"("companyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "mouvements_tresorerie_cleSource_key" ON "mouvements_tresorerie"("cleSource");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_companyId_statut_dateValeur_idx" ON "mouvements_tresorerie"("companyId", "statut", "dateValeur");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_companyId_statut_dateOperation_idx" ON "mouvements_tresorerie"("companyId", "statut", "dateOperation");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_companyId_statut_dateEcheance_idx" ON "mouvements_tresorerie"("companyId", "statut", "dateEcheance");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_companyId_compteId_statut_sens_idx" ON "mouvements_tresorerie"("companyId", "compteId", "statut", "sens");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_tiersId_idx" ON "mouvements_tresorerie"("tiersId");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_invoiceId_idx" ON "mouvements_tresorerie"("invoiceId");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_achatId_idx" ON "mouvements_tresorerie"("achatId");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_avoirId_idx" ON "mouvements_tresorerie"("avoirId");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_chequeId_idx" ON "mouvements_tresorerie"("chequeId");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_effetId_idx" ON "mouvements_tresorerie"("effetId");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_paymentId_idx" ON "mouvements_tresorerie"("paymentId");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_mouvementFinancierId_idx" ON "mouvements_tresorerie"("mouvementFinancierId");

-- CreateIndex
CREATE INDEX "mouvements_tresorerie_annuleParId_idx" ON "mouvements_tresorerie"("annuleParId");

-- AddForeignKey
ALTER TABLE "comptes_tresorerie" ADD CONSTRAINT "comptes_tresorerie_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comptes_tresorerie" ADD CONSTRAINT "comptes_tresorerie_companyBankAccountId_fkey" FOREIGN KEY ("companyBankAccountId") REFERENCES "company_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_annuleParId_fkey" FOREIGN KEY ("annuleParId") REFERENCES "mouvements_tresorerie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES "achats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_avoirId_fkey" FOREIGN KEY ("avoirId") REFERENCES "avoirs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_chequeId_fkey" FOREIGN KEY ("chequeId") REFERENCES "cheques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes_tresorerie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_effetId_fkey" FOREIGN KEY ("effetId") REFERENCES "effets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_mouvementFinancierId_fkey" FOREIGN KEY ("mouvementFinancierId") REFERENCES "mouvements_financiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_tresorerie" ADD CONSTRAINT "mouvements_tresorerie_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
