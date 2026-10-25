-- AlterTable
ALTER TABLE "products" ADD COLUMN     "estSurCommande" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quantiteParUnite" DECIMAL(19,3);
