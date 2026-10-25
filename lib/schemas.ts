import { z } from "zod";

// ─── Shared ───────────────────────────────────────────────────────────────────

const decimalString = z.union([
    z.string().regex(/^\d+(\.\d+)?$/, "Doit être un nombre décimal positif"),
    z.number(),
]).transform((v) => typeof v === "number" ? String(v) : v);

const optionalDecimalString = z
    .union([
        z.string().regex(/^\d+(\.\d+)?$/, "Doit être un nombre décimal positif"),
        z.number(),
        z.literal(""),
    ])
    .transform((v) => (v === "" ? null : typeof v === "number" ? String(v) : v))
    .optional()
    .nullable();

// ─── Tiers ───────────────────────────────────────────────────────────────────

export const tiersSchema = z.object({
    code: z.string().min(1, "Code requis").max(10),
    raisonSociale: z.string().min(2, "Raison sociale requise"),
    matriculeFiscal: z.string().optional().nullable(),
    adresse: z.string().optional().nullable(),
    ville: z.string().optional().nullable(),
    codePostal: z.string().optional().nullable(),
    telephone: z.string().optional().nullable(),
    email: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
    siteWeb: z.string().optional().nullable(),
    assujettTVA: z.boolean().default(true),
    exonereTVA: z.boolean().default(false),
    tauxRetenue: z.coerce.number().min(0).max(100).default(0),
    ribBancaire: z.string().optional().nullable(),
    banque: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    actif: z.boolean().default(true),
    devise: z.string().default("TND"),
    deviseSecondaire: z.string().optional().nullable(),
    isClient: z.boolean().default(true),
    isFournisseur: z.boolean().default(false),
    contactNom: z.string().optional().nullable(),
    contactTel: z.string().optional().nullable(),
});

export type TiersInput = z.infer<typeof tiersSchema>;

// ─── Product Supplier ───────────────────────────────────────────────────────

export const productSupplierInputSchema = z.object({
    supplierId: z.string().min(1, "Fournisseur requis"),
    purchasePrice: z.number().min(0, "Prix d'achat invalide"),
    reference: z.string().optional().nullable(),
    isDefault: z.boolean().default(false),
});

export type ProductSupplierInput = z.infer<typeof productSupplierInputSchema>;

// ─── Product ──────────────────────────────────────────────────────────────────

export const productSchema = z.object({
    code: z.string().min(1, "Code requis").max(20),
    nom: z.string().min(1, "Nom requis"),
    description: z.string().optional().nullable(),
    categorieId: z.string().optional().nullable(),
    marqueId: z.string().optional().nullable(),
    tiersId: z.string().optional().nullable(),
    photoUrl: z.string().optional().nullable(),
    ficheTechniqueUrl: z.string().optional().nullable(),
    prixHT: decimalString,
    tauxTVA: z.coerce.number().min(0).max(100).default(19),
    fodec: z.boolean().default(false),
    tauxFodec: z.coerce.number().min(0).max(100).default(1),
    stockActuel: z.coerce.number().min(0).default(0),
    stockMinimum: z.coerce.number().min(0).default(0),
    unite: z.string().default("Pièce"),
    estSurCommande: z.boolean().default(false),
    quantiteParUnite: z.coerce.number().min(0).optional().nullable(),
    actif: z.boolean().default(true),
    suppliers: z.array(productSupplierInputSchema).optional().default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

// ─── Invoice Line ─────────────────────────────────────────────────────────────

export const invoiceLineSchema = z.object({
    productId: z.string().optional().nullable(),
    variantId: z.string().optional().nullable(),
    description: z.string().min(1, "Description requise"),
    quantite: z.coerce.number().positive("Quantité doit être positive"),
    prixHT: decimalString,
    remise: z.coerce.number().min(0).max(100).default(0),
    tauxTVA: z.coerce.number().min(0).max(100).default(19),
    fodec: z.boolean().default(false),
    tauxFodec: z.coerce.number().min(0).max(100).default(1),
});

export type InvoiceLineInput = z.infer<typeof invoiceLineSchema>;

// ─── Invoice ──────────────────────────────────────────────────────────────────

export const invoiceSchema = z.object({
    tiersId: z.string().min(1, "Tiers requis"),
    dateEmission: z.string().min(1, "Date d'émission requise"),
    dateEcheance: z.string().optional().nullable(),
    lines: z
        .array(invoiceLineSchema)
        .min(1, "Au moins une ligne de facturation requise"),
    notes: z.string().optional().nullable(),
    bcViseActif: z.boolean().default(false),
    bcViseNumero: z.string().optional().nullable(),
    dateSN: z.string().optional().nullable(),
    poids: z.coerce.number().min(0).optional().nullable(),
    poidsBrut: z.coerce.number().min(0).optional().nullable(),
    nbColis: z.coerce.number().int().min(0).optional().nullable(),
    devise: z.string().default("TND"),
    tauxChange: decimalString.optional().nullable(),
    montantTND: decimalString.optional().nullable(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;

// ─── Quote ────────────────────────────────────────────────────────────────────

export const quoteSchema = z.object({
    tiersId: z.string().min(1, "Tiers requis"),
    dateCreation: z.string().min(1, "Date requise"),
    dateExpiration: z.string().optional().nullable(),
    lines: z
        .array(invoiceLineSchema)
        .min(1, "Au moins une ligne requise"),
    notes: z.string().optional().nullable(),
    devise: z.string().default("TND"),
    tauxChange: decimalString.optional().nullable(),
    montantTND: decimalString.optional().nullable(),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

// ─── Avoir ─────────────────────────────────────────────────────────────────────

export const avoirLineSchema = z.object({
    productId: z.string().optional().nullable(),
    description: z.string().min(1, "Description requise"),
    quantite: z.coerce.number().positive("Quantité doit être positive"),
    prixHT: decimalString,
    remise: z.coerce.number().min(0).max(100).default(0),
    tauxTVA: z.coerce.number().min(0).max(100).default(19),
    fodec: z.boolean().default(false),
    tauxFodec: z.coerce.number().min(0).max(100).default(1),
});

export type AvoirLineInput = z.infer<typeof avoirLineSchema>;

export const avoirSchema = z.object({
    type: z.enum(["SIMPLE", "FINANCIER"]).default("SIMPLE"),
    invoiceId: z.string().optional().nullable(),
    tiersId: z.string().optional().nullable(),
    dateEmission: z.string().min(1, "Date d'émission requise"),
    motif: z.string().optional().nullable(),
    lines: z
        .array(avoirLineSchema)
        .min(1, "Au moins une ligne requise"),
    notes: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.type === "SIMPLE") {
        if (!data.tiersId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiersId"], message: "Tiers requis pour un avoir simple" });
        }
        if (!data.invoiceId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invoiceId"], message: "Facture requise pour un avoir simple" });
        }
    }
    if (data.type === "FINANCIER") {
        if (!data.tiersId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiersId"], message: "Tiers requis pour un avoir financier" });
        }
    }
});

export type AvoirInput = z.infer<typeof avoirSchema>;

// ─── Bon de Livraison ─────────────────────────────────────────────────────────

export const blSchema = z.object({
    tiersId: z.string().min(1, "Tiers requis"),
    dateCreation: z.string().min(1, "Date requise"),
    dateLivraison: z.string().optional().nullable(),
    lines: z
        .array(invoiceLineSchema)
        .min(1, "Au moins une ligne requise"),
    notes: z.string().optional().nullable(),
    blViseActif: z.boolean().default(false),
    snNumero: z.string().optional().nullable(),
    dateSN: z.string().optional().nullable(),
    poidsBrut: z.coerce.number().min(0).optional().nullable(),
    poidsNet: z.coerce.number().min(0).optional().nullable(),
    nbColis: z.coerce.number().int().min(0).optional().nullable(),
    devise: z.string().default("TND"),
    tauxChange: decimalString.optional().nullable(),
    montantTND: decimalString.optional().nullable(),
});

export type BLInput = z.infer<typeof blSchema>;

// ─── Payment ──────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
    invoiceId: z.string().optional().nullable(),
    achatId: z.string().optional().nullable(),
    tiersId: z.string().min(1, "Tiers requis"),
    montant: decimalString,
    methode: z.enum(["ESPECES", "VIREMENT", "CARTE", "CHEQUE", "EFFET"]),
    reference: z.string().optional().nullable(),
    dateReglement: z.string().min(1, "Date requise"),
    notes: z.string().optional().nullable(),
}).refine((data) => data.invoiceId || data.achatId, {
    message: "Facture ou achat requis",
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// ─── Cheque ───────────────────────────────────────────────────────────────────

export const chequeSchema = z.object({
    numero: z.string().min(1, "Numéro requis"),
    banque: z.string().optional().nullable(),
    type: z.enum(["RECU", "EMIS"]),
    tiersId: z.string().optional().nullable(),
    invoiceId: z.string().optional().nullable(),
    beneficiaire: z.string().min(1, "Bénéficiaire requis"),
    montant: decimalString,
    dateEmission: z.string().min(1, "Date émission requise"),
    dateEcheance: z.string().min(1, "Date échéance requise"),
    banqueBeneficiaire: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
    if (data.type === "RECU" && !data.tiersId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiersId"], message: "Un client est requis pour un chèque reçu." });
    }
    if (data.type === "EMIS" && !data.tiersId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tiersId"], message: "Un fournisseur est requis pour un chèque émis." });
    }
});

export type ChequeInput = z.infer<typeof chequeSchema>;

export const effetSchema = z.object({
    type: z.enum(["RECU", "EMIS"]),
    invoiceId: z.string().optional().nullable(),
    montant: decimalString,
    tire: z.string().min(1, "Tiré requis"),
    tireAdresse: z.string().optional().nullable(),
    tireBanque: z.string().optional().nullable(),
    beneficiaire: z.string().min(1, "Bénéficiaire requis"),
    tireurId: z.string().optional().nullable(),
    fournisseurId: z.string().optional().nullable(),
    companyBankAccountId: z.string().optional().nullable(),
    dateCreation: z.string().min(1, "Date création requise"),
    dateEcheance: z.string().min(1, "Date échéance requise"),
    notes: z.string().optional().nullable(),
    ordrePaiementNumero: z.string().optional().nullable(),
    achatsLies: z.array(z.object({
        achatId: z.string(),
        montantAlloue: decimalString,
    })).optional().default([]),
}).superRefine((data, ctx) => {
    if (data.type === "EMIS") {
        if (!data.fournisseurId) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fournisseurId"], message: "Un fournisseur est requis pour un effet émis." });
        }
    }
});

export type EffetInput = z.infer<typeof effetSchema>;

export const effetUpdateSchema = z.object({
    status: z.enum(["EN_PORTEFEUILLE", "REMIS_ESCOMPTE", "ENDOSSE", "IMPAYE", "PAYE", "ANNULE"]),
    tauxEscompte: z.coerce.number().optional().nullable(),
    frais: optionalDecimalString,
    netEncaisse: optionalDecimalString,
    dateRemise: z.string().optional().nullable(),
    endosseA: z.string().optional().nullable(),
    endosseLe: z.string().optional().nullable(),
    motifImpaye: z.string().optional().nullable(),
    dateImpaye: z.string().optional().nullable(),
    fraisProtet: optionalDecimalString,
    notes: z.string().optional().nullable(),
});

export type EffetUpdateInput = z.infer<typeof effetUpdateSchema>;

export const companyBankAccountSchema = z.object({
    nomBanque: z.string().min(1, "Nom de banque requis"),
    rib: z.string().optional().nullable(),
    agence: z.string().optional().nullable(),
    isDefault: z.boolean().optional().default(false),
    actif: z.boolean().optional().default(true),
});

export type CompanyBankAccountInput = z.infer<typeof companyBankAccountSchema>;

// ─── Settings ─────────────────────────────────────────────────────────────────

export const cartonTypeSchema = z.object({
    id: z.string().min(1, "Identifiant requis"),
    nom: z.string().min(1, "Nom du carton requis"),
    capacite: z.coerce.number().int().min(1, "Capacité minimale : 1"),
    longueur: z.coerce.number().int().min(0).optional().nullable(),
    largeur: z.coerce.number().int().min(0).optional().nullable(),
    hauteur: z.coerce.number().int().min(0).optional().nullable(),
});

export type CartonTypeInput = z.infer<typeof cartonTypeSchema>;

export const settingsSchema = z.object({
    raisonSociale: z.string().min(1, "Raison sociale requise"),
    matriculeFiscal: z.string().optional(),
    adresse: z.string().optional(),
    ville: z.string().optional(),
    codePostal: z.string().optional(),
    telephone: z.string().optional(),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    siteWeb: z.string().optional(),
    ribBancaire: z.string().optional(),
    banque: z.string().optional(),
    tauxTVADefaut: z.coerce.number().min(0).max(100).default(19),
    tauxFodecDefaut: z.coerce.number().min(0).max(100).default(1),
    prefixeFacture: z.string().default("FAC"),
    prefixeDevis: z.string().default("DEV"),
    prefixeBL: z.string().default("BL"),
    anneeFormat: z.boolean().default(true),
    alerteStockActif: z.boolean().default(true),
    alerteEcheanceJours: z.coerce.number().int().min(1).max(90).default(7),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

// ─── API Response ─────────────────────────────────────────────────────────────

export const apiErrorSchema = z.object({
    error: z.string(),
    details: z.unknown().optional(),
});

export function successResponse<T>(data: T) {
    return { data, success: true };
}

export function errorResponse(message: string, details?: unknown) {
    return { error: message, details, success: false };
}
