-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('BROUILLON', 'ENVOYEE', 'PARTIELLE', 'PAYEE', 'EN_RETARD', 'ANNULEE');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('BROUILLON', 'ENVOYEE', 'ACCEPTEE', 'REFUSEE', 'EXPIREE', 'FACTUREE');

-- CreateEnum
CREATE TYPE "BonLivraisonStatus" AS ENUM ('BROUILLON', 'LIVRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "ChequeType" AS ENUM ('RECU', 'EMIS');

-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('EN_ATTENTE', 'ENCAISSE', 'REJETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "EffetStatus" AS ENUM ('EN_PORTEFEUILLE', 'REMIS_ESCOMPTE', 'ENDOSSE', 'IMPAYE', 'PAYE', 'ANNULE');

-- CreateEnum
CREATE TYPE "EffetType" AS ENUM ('RECU', 'EMIS');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ESPECES', 'CHEQUE', 'VIREMENT', 'CARTE', 'EFFET');

-- CreateEnum
CREATE TYPE "StockStatus" AS ENUM ('OK', 'CRITIQUE', 'RUPTURE');

-- CreateEnum
CREATE TYPE "BonCommandeStatus" AS ENUM ('BROUILLON', 'ACCEPTE', 'ANNULE');

-- CreateEnum
CREATE TYPE "SourceLigne" AS ENUM ('PRODUCTION', 'STOCK');

-- CreateEnum
CREATE TYPE "StatutRapprochement" AS ENUM ('EN_ATTENTE_DETAIL', 'ECART_DETECTE', 'RECONCILIE');

-- CreateEnum
CREATE TYPE "AchatStatus" AS ENUM ('BROUILLON', 'VALIDEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "AchatType" AS ENUM ('BL', 'FACTURE');

-- CreateEnum
CREATE TYPE "AchatCategorie" AS ENUM ('MATIERES_PREMIERES', 'TENUES_TRAVAIL', 'DIVERS');

-- CreateEnum
CREATE TYPE "MouvementType" AS ENUM ('ENTREE', 'SORTIE', 'AJUSTEMENT');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('ACHAT', 'VENTE', 'INVENTAIRE');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('BROUILLON', 'EN_COURS', 'VALIDE', 'ANNULE');

-- CreateEnum
CREATE TYPE "AvoirStatus" AS ENUM ('BROUILLON', 'EMIS', 'REMBOURSE', 'ANNULE');

-- CreateEnum
CREATE TYPE "AvoirType" AS ENUM ('SIMPLE', 'FINANCIER');

-- CreateEnum
CREATE TYPE "MouvementFinancierType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT NOT NULL DEFAULT '',
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "permissions" TEXT[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "verificationCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companies" (
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("userId","companyId")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matriculeFiscal" TEXT,
    "adresse" TEXT,
    "ville" TEXT,
    "codePostal" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "ribBancaire" TEXT,
    "banque" TEXT,
    "logo" TEXT,
    "type" TEXT NOT NULL DEFAULT 'LOCALE',
    "devise" TEXT NOT NULL DEFAULT 'TND',
    "deviseDefaut" TEXT,
    "tauxTVADefaut" DECIMAL(5,2) NOT NULL DEFAULT 19,
    "tauxFodecDefaut" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "prefixeFacture" TEXT NOT NULL DEFAULT 'FAC',
    "prefixeDevis" TEXT NOT NULL DEFAULT 'DEV',
    "prefixeBL" TEXT NOT NULL DEFAULT 'BL',
    "prefixeBC" TEXT NOT NULL DEFAULT 'BC',
    "prefixeAchat" TEXT NOT NULL DEFAULT 'ACH',
    "prefixeBLAchat" TEXT NOT NULL DEFAULT 'BL-A',
    "prefixeAvoir" TEXT NOT NULL DEFAULT 'AVOIR',
    "anneeFormat" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "cartonTypeIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "alerteStockActif" BOOLEAN NOT NULL DEFAULT true,
    "alerteEcheanceJours" INTEGER NOT NULL DEFAULT 7,
    "openaiApiKey" TEXT DEFAULT '',
    "geminiApiKey" TEXT DEFAULT '',
    "mistralApiKey" TEXT DEFAULT '',
    "openrouterApiKey" TEXT DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

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
    "contactFonction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marques" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "categorieId" TEXT,
    "marqueId" TEXT,
    "tiersId" TEXT,
    "photoUrl" TEXT,
    "ficheTechniqueUrl" TEXT,
    "codeBarre" TEXT,
    "prixHT" DECIMAL(19,4) NOT NULL,
    "prixAchat" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 19,
    "fodec" BOOLEAN NOT NULL DEFAULT false,
    "tauxFodec" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "stockActuel" DECIMAL(19,3) NOT NULL DEFAULT 0,
    "stockMinimum" DECIMAL(19,3) NOT NULL DEFAULT 0,
    "unite" TEXT NOT NULL DEFAULT 'Pièce',
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'OK',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT,
    "attributs" JSONB,
    "prixHT" DECIMAL(19,4),
    "stockActuel" DECIMAL(19,3) NOT NULL DEFAULT 0,
    "stockMinimum" DECIMAL(19,3) NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiches_techniques" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiches_techniques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matieres_premieres" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unite" TEXT NOT NULL,
    "prixUnitaire" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "stockActuel" DECIMAL(19,3) NOT NULL DEFAULT 0,
    "stockMinimum" DECIMAL(19,3) NOT NULL DEFAULT 0,
    "fournisseurId" TEXT,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matieres_premieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produit_compositions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "matiereId" TEXT NOT NULL,
    "quantite" DECIMAL(19,4) NOT NULL,
    "unite" TEXT NOT NULL,

    CONSTRAINT "produit_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designs_personnalises" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "nom" TEXT NOT NULL,
    "layers" JSONB NOT NULL,
    "thumbnail" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designs_personnalises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordres_fabrication" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tiersId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "designId" TEXT,
    "bonCommandeLineId" TEXT,
    "quantite" INTEGER NOT NULL,
    "details" JSONB,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "dateLivraison" TIMESTAMP(3),
    "ficheTechniqueUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ordres_fabrication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordres_matieres" (
    "id" TEXT NOT NULL,
    "ordreId" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "quantitePrevue" DECIMAL(19,4) NOT NULL,
    "quantiteUtilisee" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "unite" TEXT NOT NULL,

    CONSTRAINT "ordres_matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_lists" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ordreId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "capaciteCarton" INTEGER NOT NULL DEFAULT 0,
    "cartonTypes" JSONB,
    "nbCartons" INTEGER NOT NULL DEFAULT 0,
    "totalPieces" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'GENERE',
    "packingListUrl" TEXT,
    "etiquettesUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packing_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_cartons" (
    "id" TEXT NOT NULL,
    "packingListId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "contenu" JSONB NOT NULL,
    "totalPieces" INTEGER NOT NULL DEFAULT 0,
    "capacite" INTEGER,
    "typeNom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packing_cartons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carton_types" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER NOT NULL,
    "longueur" INTEGER,
    "largeur" INTEGER,
    "hauteur" INTEGER,
    "companyId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carton_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tiersId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3),
    "baseHT" DECIMAL(19,4) NOT NULL,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "totalTVA" DECIMAL(19,4) NOT NULL,
    "totalFodec" DECIMAL(19,4) NOT NULL,
    "totalRetenue" DECIMAL(19,4) NOT NULL,
    "totalTTC" DECIMAL(19,4) NOT NULL,
    "montantPaye" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "resteAPayer" DECIMAL(19,4) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "bcViseActif" BOOLEAN NOT NULL DEFAULT false,
    "bcViseNumero" TEXT,
    "dateSN" TIMESTAMP(3),
    "poids" DECIMAL(10,2),
    "poidsBrut" DECIMAL(10,2),
    "nbColis" INTEGER,
    "devise" TEXT NOT NULL DEFAULT 'TND',
    "tauxChange" DECIMAL(10,4),
    "montantTND" DECIMAL(19,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL(19,3) NOT NULL,
    "prixHT" DECIMAL(19,4) NOT NULL,
    "remise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "fodec" BOOLEAN NOT NULL DEFAULT false,
    "tauxFodec" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tiersId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL,
    "dateExpiration" TIMESTAMP(3),
    "baseHT" DECIMAL(19,4) NOT NULL,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "totalTVA" DECIMAL(19,4) NOT NULL,
    "totalFodec" DECIMAL(19,4) NOT NULL,
    "totalTTC" DECIMAL(19,4) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_lines" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL(19,3) NOT NULL,
    "prixHT" DECIMAL(19,4) NOT NULL,
    "remise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "fodec" BOOLEAN NOT NULL DEFAULT false,
    "tauxFodec" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_commande" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tiersId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL,
    "dateExpiration" TIMESTAMP(3),
    "baseHT" DECIMAL(19,4) NOT NULL,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "totalTVA" DECIMAL(19,4) NOT NULL,
    "totalFodec" DECIMAL(19,4) NOT NULL,
    "totalTTC" DECIMAL(19,4) NOT NULL,
    "status" "BonCommandeStatus" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "referenceClient" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bons_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_commande_lines" (
    "id" TEXT NOT NULL,
    "bonCommandeId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL(19,3) NOT NULL,
    "prixHT" DECIMAL(19,4) NOT NULL,
    "remise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "fodec" BOOLEAN NOT NULL DEFAULT false,
    "tauxFodec" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "typeSource" "SourceLigne" NOT NULL DEFAULT 'STOCK',
    "quantiteDetaillee" DECIMAL(19,3) NOT NULL DEFAULT 0,
    "statutRapprochement" "StatutRapprochement" NOT NULL DEFAULT 'EN_ATTENTE_DETAIL',
    "derniereVerification" TIMESTAMP(3),

    CONSTRAINT "bons_commande_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_commande_ligne_details" (
    "id" TEXT NOT NULL,
    "bonCommandeLineId" TEXT NOT NULL,
    "variantId" TEXT,
    "taille" TEXT,
    "couleur" TEXT,
    "broderie" TEXT,
    "impressionDtf" TEXT,
    "quantite" DECIMAL(19,3) NOT NULL,
    "sourceDocument" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bons_commande_ligne_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_livraison" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tiersId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL,
    "dateLivraison" TIMESTAMP(3),
    "baseHT" DECIMAL(19,4) NOT NULL,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "totalTVA" DECIMAL(19,4) NOT NULL,
    "totalFodec" DECIMAL(19,4) NOT NULL,
    "totalTTC" DECIMAL(19,4) NOT NULL,
    "notes" TEXT,
    "status" "BonLivraisonStatus" NOT NULL DEFAULT 'BROUILLON',
    "blViseActif" BOOLEAN NOT NULL DEFAULT false,
    "snNumero" TEXT,
    "dateSN" TIMESTAMP(3),
    "poidsBrut" DECIMAL(10,2),
    "poidsNet" DECIMAL(10,2),
    "nbColis" INTEGER,
    "devise" TEXT NOT NULL DEFAULT 'TND',
    "tauxChange" DECIMAL(10,4),
    "montantTND" DECIMAL(19,4),
    "bonCommandeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bons_livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bons_livraison_lines" (
    "id" TEXT NOT NULL,
    "bonLivraisonId" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL(19,3) NOT NULL,
    "prixHT" DECIMAL(19,4) NOT NULL,
    "remise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "fodec" BOOLEAN NOT NULL DEFAULT false,
    "tauxFodec" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bons_livraison_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achats" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tiersId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dateFacture" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3),
    "referenceFournisseur" TEXT,
    "type" "AchatType" NOT NULL DEFAULT 'FACTURE',
    "categorieAchat" "AchatCategorie",
    "blAchatId" TEXT,
    "baseHT" DECIMAL(19,4) NOT NULL,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "totalTVA" DECIMAL(19,4) NOT NULL,
    "totalTTC" DECIMAL(19,4) NOT NULL,
    "timbreFiscal" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "montantPaye" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "resteAPayer" DECIMAL(19,4),
    "status" "AchatStatus" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achat_lines" (
    "id" TEXT NOT NULL,
    "achatId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL(19,3) NOT NULL,
    "prixAchat" DECIMAL(19,4) NOT NULL,
    "remise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL DEFAULT 19,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "achat_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_stock" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "type" "MouvementType" NOT NULL,
    "quantite" DECIMAL(19,3) NOT NULL,
    "referenceType" "ReferenceType" NOT NULL,
    "referenceId" TEXT,
    "achatId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "tiersId" TEXT NOT NULL,
    "montant" DECIMAL(19,4) NOT NULL,
    "methode" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "dateReglement" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "avoirId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cheques" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "banque" TEXT NOT NULL,
    "type" "ChequeType" NOT NULL,
    "tiersId" TEXT,
    "invoiceId" TEXT,
    "beneficiaire" TEXT NOT NULL,
    "montant" DECIMAL(19,4) NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "notes" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "effets" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "type" "EffetType" NOT NULL,
    "invoiceId" TEXT,
    "montant" DECIMAL(19,4) NOT NULL,
    "tire" TEXT NOT NULL,
    "tireAdresse" TEXT,
    "tireBanque" TEXT,
    "beneficiaire" TEXT NOT NULL,
    "tireurId" TEXT,
    "fournisseurId" TEXT,
    "dateCreation" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3) NOT NULL,
    "dateRemise" TIMESTAMP(3),
    "endosseLe" TIMESTAMP(3),
    "dateImpaye" TIMESTAMP(3),
    "status" "EffetStatus" NOT NULL DEFAULT 'EN_PORTEFEUILLE',
    "tauxEscompte" DECIMAL(5,2),
    "frais" DECIMAL(19,4),
    "netEncaisse" DECIMAL(19,4),
    "endosseA" TEXT,
    "motifImpaye" TEXT,
    "fraisProtet" DECIMAL(19,4),
    "rappel15jEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "rappel10jEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "rappel5jEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "rappelJourEnvoye" BOOLEAN NOT NULL DEFAULT false,
    "split_group" TEXT,
    "split_index" INTEGER,
    "split_total" INTEGER,
    "notes" TEXT,
    "ordrePaiementNumero" TEXT,
    "companyId" TEXT NOT NULL,
    "companyBankAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "effets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_bank_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nomBanque" TEXT NOT NULL,
    "rib" TEXT,
    "agence" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "effet_achats" (
    "id" TEXT NOT NULL,
    "effetId" TEXT NOT NULL,
    "achatId" TEXT NOT NULL,
    "montantAlloue" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "effet_achats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ngp_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ngp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exports" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tiersId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dateCreation" TIMESTAMP(3) NOT NULL,
    "decVente" TEXT,
    "dateDecVente" TIMESTAMP(3),
    "simultanee" TEXT,
    "dateSimultanee" TIMESTAMP(3),
    "status" "ExportStatus" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_lines" (
    "id" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "bonLivraisonId" TEXT,
    "invoiceId" TEXT,
    "ngpCodeId" TEXT,
    "ngpCode" TEXT,
    "barcode" TEXT,
    "snNumero" TEXT,
    "quantite" DECIMAL(19,3) NOT NULL,
    "quantiteBL" DECIMAL(19,3),
    "resteQuantite" DECIMAL(19,3),
    "bonLivraisonNumero" TEXT,
    "dateBL" TIMESTAMP(3),
    "invoiceNumero" TEXT,
    "dateFact" TIMESTAMP(3),

    CONSTRAINT "export_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avoirs" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "type" "AvoirType" NOT NULL DEFAULT 'SIMPLE',
    "invoiceId" TEXT,
    "tiersId" TEXT,
    "companyId" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,
    "baseHT" DECIMAL(19,4) NOT NULL,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "totalTVA" DECIMAL(19,4) NOT NULL,
    "totalFodec" DECIMAL(19,4) NOT NULL,
    "totalTTC" DECIMAL(19,4) NOT NULL,
    "status" "AvoirStatus" NOT NULL DEFAULT 'BROUILLON',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "avoirs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "avoir_lines" (
    "id" TEXT NOT NULL,
    "avoirId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantite" DECIMAL(19,3) NOT NULL,
    "prixHT" DECIMAL(19,4) NOT NULL,
    "remise" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tauxTVA" DECIMAL(5,2) NOT NULL,
    "fodec" BOOLEAN NOT NULL DEFAULT false,
    "tauxFodec" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "totalHT" DECIMAL(19,4) NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "avoir_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements_financiers" (
    "id" TEXT NOT NULL,
    "type" "MouvementFinancierType" NOT NULL,
    "montant" DECIMAL(19,4) NOT NULL,
    "avoirId" TEXT,
    "tiersId" TEXT,
    "companyId" TEXT NOT NULL,
    "dateMouvement" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mouvements_financiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "effetId" TEXT,
    "bonCommandeLineId" TEXT,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_companies_companyId_idx" ON "user_companies"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_matriculeFiscal_key" ON "companies"("matriculeFiscal");

-- CreateIndex
CREATE UNIQUE INDEX "tiers_matriculeFiscal_key" ON "tiers"("matriculeFiscal");

-- CreateIndex
CREATE INDEX "tiers_code_idx" ON "tiers"("code");

-- CreateIndex
CREATE INDEX "tiers_email_idx" ON "tiers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "marques_nom_key" ON "marques"("nom");

-- CreateIndex
CREATE INDEX "products_code_idx" ON "products"("code");

-- CreateIndex
CREATE INDEX "products_categorieId_idx" ON "products"("categorieId");

-- CreateIndex
CREATE INDEX "products_marqueId_idx" ON "products"("marqueId");

-- CreateIndex
CREATE INDEX "products_stockStatus_idx" ON "products"("stockStatus");

-- CreateIndex
CREATE INDEX "matieres_premieres_companyId_idx" ON "matieres_premieres"("companyId");

-- CreateIndex
CREATE INDEX "matieres_premieres_type_idx" ON "matieres_premieres"("type");

-- CreateIndex
CREATE INDEX "produit_compositions_productId_idx" ON "produit_compositions"("productId");

-- CreateIndex
CREATE INDEX "produit_compositions_matiereId_idx" ON "produit_compositions"("matiereId");

-- CreateIndex
CREATE INDEX "designs_personnalises_companyId_idx" ON "designs_personnalises"("companyId");

-- CreateIndex
CREATE INDEX "designs_personnalises_productId_idx" ON "designs_personnalises"("productId");

-- CreateIndex
CREATE INDEX "ordres_fabrication_companyId_idx" ON "ordres_fabrication"("companyId");

-- CreateIndex
CREATE INDEX "ordres_fabrication_tiersId_idx" ON "ordres_fabrication"("tiersId");

-- CreateIndex
CREATE INDEX "ordres_fabrication_statut_idx" ON "ordres_fabrication"("statut");

-- CreateIndex
CREATE INDEX "ordres_fabrication_code_idx" ON "ordres_fabrication"("code");

-- CreateIndex
CREATE INDEX "ordres_fabrication_bonCommandeLineId_idx" ON "ordres_fabrication"("bonCommandeLineId");

-- CreateIndex
CREATE INDEX "ordres_matieres_ordreId_idx" ON "ordres_matieres"("ordreId");

-- CreateIndex
CREATE INDEX "ordres_matieres_matiereId_idx" ON "ordres_matieres"("matiereId");

-- CreateIndex
CREATE INDEX "packing_lists_companyId_idx" ON "packing_lists"("companyId");

-- CreateIndex
CREATE INDEX "packing_lists_ordreId_idx" ON "packing_lists"("ordreId");

-- CreateIndex
CREATE INDEX "packing_lists_numero_idx" ON "packing_lists"("numero");

-- CreateIndex
CREATE INDEX "packing_lists_statut_idx" ON "packing_lists"("statut");

-- CreateIndex
CREATE INDEX "packing_cartons_packingListId_idx" ON "packing_cartons"("packingListId");

-- CreateIndex
CREATE UNIQUE INDEX "packing_cartons_packingListId_numero_key" ON "packing_cartons"("packingListId", "numero");

-- CreateIndex
CREATE INDEX "carton_types_nom_idx" ON "carton_types"("nom");

-- CreateIndex
CREATE INDEX "invoices_companyId_idx" ON "invoices"("companyId");

-- CreateIndex
CREATE INDEX "invoices_tiersId_idx" ON "invoices"("tiersId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_companyId_status_idx" ON "invoices"("companyId", "status");

-- CreateIndex
CREATE INDEX "invoices_dateEcheance_idx" ON "invoices"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_numero_companyId_key" ON "invoices"("numero", "companyId");

-- CreateIndex
CREATE INDEX "quotes_companyId_idx" ON "quotes"("companyId");

-- CreateIndex
CREATE INDEX "quotes_tiersId_idx" ON "quotes"("tiersId");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_companyId_status_idx" ON "quotes"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_numero_companyId_key" ON "quotes"("numero", "companyId");

-- CreateIndex
CREATE INDEX "bons_commande_companyId_idx" ON "bons_commande"("companyId");

-- CreateIndex
CREATE INDEX "bons_commande_tiersId_idx" ON "bons_commande"("tiersId");

-- CreateIndex
CREATE INDEX "bons_commande_status_idx" ON "bons_commande"("status");

-- CreateIndex
CREATE INDEX "bons_commande_companyId_status_idx" ON "bons_commande"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bons_commande_numero_companyId_key" ON "bons_commande"("numero", "companyId");

-- CreateIndex
CREATE INDEX "bons_commande_lines_statutRapprochement_idx" ON "bons_commande_lines"("statutRapprochement");

-- CreateIndex
CREATE INDEX "bons_commande_ligne_details_bonCommandeLineId_idx" ON "bons_commande_ligne_details"("bonCommandeLineId");

-- CreateIndex
CREATE INDEX "bons_commande_ligne_details_variantId_idx" ON "bons_commande_ligne_details"("variantId");

-- CreateIndex
CREATE INDEX "bons_livraison_companyId_idx" ON "bons_livraison"("companyId");

-- CreateIndex
CREATE INDEX "bons_livraison_tiersId_idx" ON "bons_livraison"("tiersId");

-- CreateIndex
CREATE INDEX "bons_livraison_status_idx" ON "bons_livraison"("status");

-- CreateIndex
CREATE INDEX "bons_livraison_companyId_status_idx" ON "bons_livraison"("companyId", "status");

-- CreateIndex
CREATE INDEX "bons_livraison_bonCommandeId_idx" ON "bons_livraison"("bonCommandeId");

-- CreateIndex
CREATE UNIQUE INDEX "bons_livraison_numero_companyId_key" ON "bons_livraison"("numero", "companyId");

-- CreateIndex
CREATE INDEX "achats_companyId_idx" ON "achats"("companyId");

-- CreateIndex
CREATE INDEX "achats_tiersId_idx" ON "achats"("tiersId");

-- CreateIndex
CREATE INDEX "achats_status_idx" ON "achats"("status");

-- CreateIndex
CREATE INDEX "achats_blAchatId_idx" ON "achats"("blAchatId");

-- CreateIndex
CREATE INDEX "achats_companyId_status_idx" ON "achats"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "achats_numero_companyId_key" ON "achats"("numero", "companyId");

-- CreateIndex
CREATE INDEX "mouvements_stock_productId_idx" ON "mouvements_stock"("productId");

-- CreateIndex
CREATE INDEX "mouvements_stock_referenceId_idx" ON "mouvements_stock"("referenceId");

-- CreateIndex
CREATE INDEX "mouvements_stock_date_idx" ON "mouvements_stock"("date");

-- CreateIndex
CREATE INDEX "payments_companyId_idx" ON "payments"("companyId");

-- CreateIndex
CREATE INDEX "payments_tiersId_idx" ON "payments"("tiersId");

-- CreateIndex
CREATE INDEX "payments_companyId_tiersId_idx" ON "payments"("companyId", "tiersId");

-- CreateIndex
CREATE INDEX "cheques_companyId_idx" ON "cheques"("companyId");

-- CreateIndex
CREATE INDEX "cheques_tiersId_idx" ON "cheques"("tiersId");

-- CreateIndex
CREATE INDEX "cheques_status_idx" ON "cheques"("status");

-- CreateIndex
CREATE INDEX "cheques_companyId_status_idx" ON "cheques"("companyId", "status");

-- CreateIndex
CREATE INDEX "effets_companyId_idx" ON "effets"("companyId");

-- CreateIndex
CREATE INDEX "effets_status_idx" ON "effets"("status");

-- CreateIndex
CREATE INDEX "effets_companyId_status_idx" ON "effets"("companyId", "status");

-- CreateIndex
CREATE INDEX "effets_dateEcheance_idx" ON "effets"("dateEcheance");

-- CreateIndex
CREATE UNIQUE INDEX "effet_achats_effetId_achatId_key" ON "effet_achats"("effetId", "achatId");

-- CreateIndex
CREATE UNIQUE INDEX "ngp_codes_code_key" ON "ngp_codes"("code");

-- CreateIndex
CREATE INDEX "exports_companyId_idx" ON "exports"("companyId");

-- CreateIndex
CREATE INDEX "exports_tiersId_idx" ON "exports"("tiersId");

-- CreateIndex
CREATE INDEX "exports_status_idx" ON "exports"("status");

-- CreateIndex
CREATE INDEX "exports_companyId_status_idx" ON "exports"("companyId", "status");

-- CreateIndex
CREATE INDEX "avoirs_companyId_idx" ON "avoirs"("companyId");

-- CreateIndex
CREATE INDEX "avoirs_tiersId_idx" ON "avoirs"("tiersId");

-- CreateIndex
CREATE INDEX "avoirs_status_idx" ON "avoirs"("status");

-- CreateIndex
CREATE INDEX "avoirs_companyId_status_idx" ON "avoirs"("companyId", "status");

-- CreateIndex
CREATE INDEX "mouvements_financiers_companyId_idx" ON "mouvements_financiers"("companyId");

-- CreateIndex
CREATE INDEX "mouvements_financiers_tiersId_idx" ON "mouvements_financiers"("tiersId");

-- CreateIndex
CREATE INDEX "mouvements_financiers_avoirId_idx" ON "mouvements_financiers"("avoirId");

-- CreateIndex
CREATE INDEX "notifications_bonCommandeLineId_idx" ON "notifications"("bonCommandeLineId");

-- CreateIndex
CREATE UNIQUE INDEX "sequences_name_year_companyId_key" ON "sequences"("name", "year", "companyId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_marqueId_fkey" FOREIGN KEY ("marqueId") REFERENCES "marques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiches_techniques" ADD CONSTRAINT "fiches_techniques_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matieres_premieres" ADD CONSTRAINT "matieres_premieres_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matieres_premieres" ADD CONSTRAINT "matieres_premieres_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_compositions" ADD CONSTRAINT "produit_compositions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_compositions" ADD CONSTRAINT "produit_compositions_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produit_compositions" ADD CONSTRAINT "produit_compositions_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres_premieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs_personnalises" ADD CONSTRAINT "designs_personnalises_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs_personnalises" ADD CONSTRAINT "designs_personnalises_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designs_personnalises" ADD CONSTRAINT "designs_personnalises_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordres_fabrication" ADD CONSTRAINT "ordres_fabrication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordres_fabrication" ADD CONSTRAINT "ordres_fabrication_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordres_fabrication" ADD CONSTRAINT "ordres_fabrication_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordres_fabrication" ADD CONSTRAINT "ordres_fabrication_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordres_fabrication" ADD CONSTRAINT "ordres_fabrication_designId_fkey" FOREIGN KEY ("designId") REFERENCES "designs_personnalises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordres_fabrication" ADD CONSTRAINT "ordres_fabrication_bonCommandeLineId_fkey" FOREIGN KEY ("bonCommandeLineId") REFERENCES "bons_commande_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordres_matieres" ADD CONSTRAINT "ordres_matieres_ordreId_fkey" FOREIGN KEY ("ordreId") REFERENCES "ordres_fabrication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordres_matieres" ADD CONSTRAINT "ordres_matieres_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres_premieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_lists" ADD CONSTRAINT "packing_lists_ordreId_fkey" FOREIGN KEY ("ordreId") REFERENCES "ordres_fabrication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_cartons" ADD CONSTRAINT "packing_cartons_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "packing_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carton_types" ADD CONSTRAINT "carton_types_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_lines" ADD CONSTRAINT "quote_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande" ADD CONSTRAINT "bons_commande_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande_lines" ADD CONSTRAINT "bons_commande_lines_bonCommandeId_fkey" FOREIGN KEY ("bonCommandeId") REFERENCES "bons_commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande_lines" ADD CONSTRAINT "bons_commande_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande_ligne_details" ADD CONSTRAINT "bons_commande_ligne_details_bonCommandeLineId_fkey" FOREIGN KEY ("bonCommandeLineId") REFERENCES "bons_commande_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_commande_ligne_details" ADD CONSTRAINT "bons_commande_ligne_details_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison" ADD CONSTRAINT "bons_livraison_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison" ADD CONSTRAINT "bons_livraison_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison" ADD CONSTRAINT "bons_livraison_bonCommandeId_fkey" FOREIGN KEY ("bonCommandeId") REFERENCES "bons_commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison_lines" ADD CONSTRAINT "bons_livraison_lines_bonLivraisonId_fkey" FOREIGN KEY ("bonLivraisonId") REFERENCES "bons_livraison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison_lines" ADD CONSTRAINT "bons_livraison_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bons_livraison_lines" ADD CONSTRAINT "bons_livraison_lines_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achats" ADD CONSTRAINT "achats_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achats" ADD CONSTRAINT "achats_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achats" ADD CONSTRAINT "achats_blAchatId_fkey" FOREIGN KEY ("blAchatId") REFERENCES "achats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achat_lines" ADD CONSTRAINT "achat_lines_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES "achats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achat_lines" ADD CONSTRAINT "achat_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_stock" ADD CONSTRAINT "mouvements_stock_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES "achats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_avoirId_fkey" FOREIGN KEY ("avoirId") REFERENCES "avoirs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effets" ADD CONSTRAINT "effets_tireurId_fkey" FOREIGN KEY ("tireurId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effets" ADD CONSTRAINT "effets_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effets" ADD CONSTRAINT "effets_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effets" ADD CONSTRAINT "effets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effets" ADD CONSTRAINT "effets_companyBankAccountId_fkey" FOREIGN KEY ("companyBankAccountId") REFERENCES "company_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_bank_accounts" ADD CONSTRAINT "company_bank_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effet_achats" ADD CONSTRAINT "effet_achats_effetId_fkey" FOREIGN KEY ("effetId") REFERENCES "effets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "effet_achats" ADD CONSTRAINT "effet_achats_achatId_fkey" FOREIGN KEY ("achatId") REFERENCES "achats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ngp_codes" ADD CONSTRAINT "ngp_codes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_lines" ADD CONSTRAINT "export_lines_exportId_fkey" FOREIGN KEY ("exportId") REFERENCES "exports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_lines" ADD CONSTRAINT "export_lines_bonLivraisonId_fkey" FOREIGN KEY ("bonLivraisonId") REFERENCES "bons_livraison"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_lines" ADD CONSTRAINT "export_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_lines" ADD CONSTRAINT "export_lines_ngpCodeId_fkey" FOREIGN KEY ("ngpCodeId") REFERENCES "ngp_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoirs" ADD CONSTRAINT "avoirs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoir_lines" ADD CONSTRAINT "avoir_lines_avoirId_fkey" FOREIGN KEY ("avoirId") REFERENCES "avoirs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "avoir_lines" ADD CONSTRAINT "avoir_lines_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_financiers" ADD CONSTRAINT "mouvements_financiers_avoirId_fkey" FOREIGN KEY ("avoirId") REFERENCES "avoirs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_financiers" ADD CONSTRAINT "mouvements_financiers_tiersId_fkey" FOREIGN KEY ("tiersId") REFERENCES "tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements_financiers" ADD CONSTRAINT "mouvements_financiers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_effetId_fkey" FOREIGN KEY ("effetId") REFERENCES "effets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_bonCommandeLineId_fkey" FOREIGN KEY ("bonCommandeLineId") REFERENCES "bons_commande_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
