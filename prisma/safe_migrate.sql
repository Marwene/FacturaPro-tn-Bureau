-- CreateTable
CREATE TABLE "tiers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "matriculeFiscal" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "isClient" BOOLEAN NOT NULL DEFAULT true,
    "isFournisseur" BOOLEAN NOT NULL DEFAULT false,
    "assujettTVA" BOOLEAN NOT NULL DEFAULT true,
    "exonereTVA" BOOLEAN NOT NULL DEFAULT false,
    "tauxRetenue" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "ribBancaire" TEXT,
    "banque" TEXT,
    "notes" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "dateBlocage" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "devise" TEXT NOT NULL DEFAULT 'TND',
    "deviseSecondaire" TEXT,
    "contactNom" TEXT,
    "contactTel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tiers_matriculeFiscal_key" ON "tiers"("matriculeFiscal");

-- Migrate Data from clients to tiers
INSERT INTO "tiers" ("id", "code", "raisonSociale", "matriculeFiscal", "adresse", "ville", "codePostal", "telephone", "email", "siteWeb", "isClient", "isFournisseur", "assujettTVA", "exonereTVA", "tauxRetenue", "creditLimit", "ribBancaire", "banque", "notes", "actif", "dateBlocage", "emailSentAt", "devise", "deviseSecondaire", "createdAt", "updatedAt")
SELECT "id", "code", "raisonSociale", "matriculeFiscal", "adresse", "ville", "codePostal", "telephone", "email", "siteWeb", true, false, "assujettTVA", "exonereTVA", "tauxRetenue", "creditLimit", "ribBancaire", "banque", "notes", "actif", "dateBlocage", "emailSentAt", "devise", "deviseSecondaire", "createdAt", "updatedAt"
FROM "clients";

-- Migrate Data from fournisseurs to tiers
INSERT INTO "tiers" ("id", "code", "raisonSociale", "matriculeFiscal", "adresse", "ville", "codePostal", "telephone", "email", "siteWeb", "isClient", "isFournisseur", "ribBancaire", "banque", "contactNom", "contactTel", "notes", "actif", "createdAt", "updatedAt")
SELECT "id", "code", "raisonSociale", "matriculeFiscal", "adresse", "ville", "codePostal", "telephone", "email", "siteWeb", false, true, "ribBancaire", "banque", "contactNom", "contactTel", "notes", "actif", "createdAt", "updatedAt"
FROM "fournisseurs"
ON CONFLICT ("matriculeFiscal") DO UPDATE SET "isFournisseur" = true, "contactNom" = EXCLUDED."contactNom", "contactTel" = EXCLUDED."contactTel";

-- DropForeignKey constraints
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_companyId_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_fournisseurId_fkey";
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_clientId_fkey";
ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_companyId_fkey";
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_clientId_fkey";
ALTER TABLE "quotes" DROP CONSTRAINT IF EXISTS "quotes_companyId_fkey";
ALTER TABLE "bons_commande" DROP CONSTRAINT IF EXISTS "bons_commande_clientId_fkey";
ALTER TABLE "bons_commande" DROP CONSTRAINT IF EXISTS "bons_commande_companyId_fkey";
ALTER TABLE "bons_livraison" DROP CONSTRAINT IF EXISTS "bons_livraison_clientId_fkey";
ALTER TABLE "bons_livraison" DROP CONSTRAINT IF EXISTS "bons_livraison_companyId_fkey";
ALTER TABLE "achats" DROP CONSTRAINT IF EXISTS "achats_fournisseurId_fkey";
ALTER TABLE "achats" DROP CONSTRAINT IF EXISTS "achats_companyId_fkey";
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_clientId_fkey";
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_companyId_fkey";
ALTER TABLE "cheques" DROP CONSTRAINT IF EXISTS "cheques_clientId_fkey";
ALTER TABLE "cheques" DROP CONSTRAINT IF EXISTS "cheques_companyId_fkey";
ALTER TABLE "effets" DROP CONSTRAINT IF EXISTS "effets_tireurId_fkey";
ALTER TABLE "effets" DROP CONSTRAINT IF EXISTS "effets_fournisseurId_fkey";
ALTER TABLE "effets" DROP CONSTRAINT IF EXISTS "effets_companyId_fkey";
ALTER TABLE "ngp_codes" DROP CONSTRAINT IF EXISTS "ngp_codes_companyId_fkey";
ALTER TABLE "exports" DROP CONSTRAINT IF EXISTS "exports_clientId_fkey";
ALTER TABLE "exports" DROP CONSTRAINT IF EXISTS "exports_companyId_fkey";
ALTER TABLE "avoirs" DROP CONSTRAINT IF EXISTS "avoirs_clientId_fkey";
ALTER TABLE "avoirs" DROP CONSTRAINT IF EXISTS "avoirs_fournisseurId_fkey";
ALTER TABLE "avoirs" DROP CONSTRAINT IF EXISTS "avoirs_companyId_fkey";
ALTER TABLE "mouvements_financiers" DROP CONSTRAINT IF EXISTS "mouvements_financiers_clientId_fkey";
ALTER TABLE "mouvements_financiers" DROP CONSTRAINT IF EXISTS "mouvements_financiers_fournisseurId_fkey";
ALTER TABLE "mouvements_financiers" DROP CONSTRAINT IF EXISTS "mouvements_financiers_companyId_fkey";

ALTER TABLE "sequences" ADD COLUMN IF NOT EXISTS "companyId" TEXT;
-- Prepare companyId for documents
DO $$
DECLARE default_company_id TEXT;
BEGIN
    SELECT "id" INTO default_company_id FROM "companies" LIMIT 1;
    IF default_company_id IS NOT NULL THEN
        UPDATE "sequences" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "users" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "invoices" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "quotes" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "bons_commande" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "bons_livraison" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "achats" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "payments" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "cheques" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "effets" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "ngp_codes" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "exports" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "avoirs" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
        UPDATE "mouvements_financiers" SET "companyId" = default_company_id WHERE "companyId" IS NULL;
    END IF;
END $$;

-- DropIndexes
DROP INDEX IF EXISTS "invoices_numero_key";
DROP INDEX IF EXISTS "quotes_numero_key";
DROP INDEX IF EXISTS "bons_commande_numero_key";
DROP INDEX IF EXISTS "bons_livraison_numero_key";
DROP INDEX IF EXISTS "achats_numero_key";
DROP INDEX IF EXISTS "effets_numero_key";
DROP INDEX IF EXISTS "exports_numero_key";
DROP INDEX IF EXISTS "avoirs_numero_key";
DROP INDEX IF EXISTS "sequences_name_key";
DROP INDEX IF EXISTS "sequences_name_year_key";

-- Map Foreign keys to tiers
ALTER TABLE "products" ADD COLUMN "tiersId" TEXT;
UPDATE "products" SET "tiersId" = "fournisseurId";
ALTER TABLE "products" DROP COLUMN "fournisseurId";

ALTER TABLE "invoices" ADD COLUMN "tiersId" TEXT;
UPDATE "invoices" SET "tiersId" = "clientId";
ALTER TABLE "invoices" DROP COLUMN "clientId";

ALTER TABLE "quotes" ADD COLUMN "tiersId" TEXT;
UPDATE "quotes" SET "tiersId" = "clientId";
ALTER TABLE "quotes" DROP COLUMN "clientId";

ALTER TABLE "bons_commande" ADD COLUMN "tiersId" TEXT;
UPDATE "bons_commande" SET "tiersId" = "clientId";
ALTER TABLE "bons_commande" DROP COLUMN "clientId";

ALTER TABLE "bons_livraison" ADD COLUMN "tiersId" TEXT;
UPDATE "bons_livraison" SET "tiersId" = "clientId";
ALTER TABLE "bons_livraison" DROP COLUMN "clientId";

ALTER TABLE "achats" ADD COLUMN "tiersId" TEXT;
UPDATE "achats" SET "tiersId" = "fournisseurId";
ALTER TABLE "achats" DROP COLUMN "fournisseurId";

ALTER TABLE "payments" ADD COLUMN "tiersId" TEXT;
UPDATE "payments" SET "tiersId" = "clientId";
ALTER TABLE "payments" DROP COLUMN "clientId";

ALTER TABLE "cheques" ADD COLUMN "tiersId" TEXT;
UPDATE "cheques" SET "tiersId" = "clientId";
ALTER TABLE "cheques" DROP COLUMN "clientId";

ALTER TABLE "exports" ADD COLUMN "tiersId" TEXT;
UPDATE "exports" SET "tiersId" = "clientId";
ALTER TABLE "exports" DROP COLUMN "clientId";

ALTER TABLE "avoirs" ADD COLUMN "tiersId" TEXT;
UPDATE "avoirs" SET "tiersId" = COALESCE("clientId", "fournisseurId");
ALTER TABLE "avoirs" DROP COLUMN "clientId", DROP COLUMN "fournisseurId";

ALTER TABLE "mouvements_financiers" ADD COLUMN "tiersId" TEXT;
UPDATE "mouvements_financiers" SET "tiersId" = COALESCE("clientId", "fournisseurId");
ALTER TABLE "mouvements_financiers" DROP COLUMN "clientId", DROP COLUMN "fournisseurId";

-- Drop original tables
DROP TABLE IF EXISTS "clients";
DROP TABLE IF EXISTS "fournisseurs";

-- Now safely use Prisma db push to apply all constraints and foreign keys!
