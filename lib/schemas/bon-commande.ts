import { z } from "zod";

export const bonCommandeLineSchema = z.object({
    productId: z.string().nullable().optional(),
    createProduct: z.boolean().default(false),
    description: z.string().min(1, "Description requise"),
    quantite: z.number().positive("Quantité doit être > 0"),
    prixHT: z.number().min(0, "Prix HT doit être ≥ 0"),
    remise: z.number().min(0).max(100).default(0),
    tauxTVA: z.number().default(19),
    fodec: z.boolean().default(false),
    tauxFodec: z.number().default(1),
    typeSource: z.enum(["PRODUCTION", "STOCK"]).default("STOCK"),
});

export const bonCommandeSchema = z.object({
    tiersId: z.string().optional().nullable(),
    dateCreation: z.string().min(1, "Date création requise"),
    dateExpiration: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    asDraft: z.boolean().default(false),
    createClient: z.boolean().default(false),
    client: z.object({
        raisonSociale: z.string().min(1),
        matriculeFiscal: z.string().nullable().optional(),
        adresse: z.string().nullable().optional(),
        ville: z.string().nullable().optional(),
        telephone: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
    }).optional(),
    referenceClient: z.string().nullable().optional(),
    totalHT: z.number().min(0).optional(),
    totalTVA: z.number().min(0).optional(),
    totalTTC: z.number().min(0).optional(),
    lines: z.array(bonCommandeLineSchema).min(1, "Au moins une ligne requise"),
});

export type BonCommandeInput = z.infer<typeof bonCommandeSchema>;
export type BonCommandeLineInput = z.infer<typeof bonCommandeLineSchema>;

// --- Detail row schema (mirrors app/api/bons-commande/[id]/detail/route.ts) ---
export const saveDetailRowSchema = z.object({
    bonCommandeLineId: z.string().min(1),
    variantId: z.string().optional().nullable(),
    taille: z.string().optional().nullable(),
    couleur: z.string().optional().nullable(),
    broderie: z.string().optional().nullable(),
    impressionDtf: z.string().optional().nullable(),
    quantite: z.coerce.number().min(0),
});

export const saveDetailSchema = z.object({
    sourceDocument: z.string().optional().nullable(),
    rows: z.array(saveDetailRowSchema).min(1),
});

export type SaveDetailInput = z.infer<typeof saveDetailSchema>;

// --- Update detail row schema (mirrors app/api/bons-commande/[id]/detail/detailId/route.ts) ---
export const updateDetailRowSchema = z.object({
    taille: z.string().optional().nullable(),
    couleur: z.string().optional().nullable(),
    broderie: z.string().optional().nullable(),
    impressionDtf: z.string().optional().nullable(),
    quantite: z.coerce.number().min(0).optional(),
});

export type UpdateDetailRowInput = z.infer<typeof updateDetailRowSchema>;

// --- Update line schema (mirrors app/api/bons-commande/[id]/lines/[lineId]/route.ts) ---
export const updateBCLineSchema = z.object({
    description: z.string().min(1).optional(),
    quantite: z.coerce.number().positive().optional(),
    prixHT: z.coerce.number().min(0).optional(),
    remise: z.coerce.number().min(0).max(100).optional(),
    tauxTVA: z.coerce.number().min(0).optional(),
    fodec: z.boolean().optional(),
    tauxFodec: z.coerce.number().min(0).optional(),
    typeSource: z.enum(["PRODUCTION", "STOCK"]).optional(),
});

export type UpdateBCLineInput = z.infer<typeof updateBCLineSchema>;

// --- Ordre de fabrication schema (mirrors app/api/ordres-fabrication/route.ts) ---
export const ordreFabricationSchema = z.object({
    productId: z.string().min(1),
    tiersId: z.string().optional().nullable(),
    variantId: z.string().optional().nullable(),
    designId: z.string().optional().nullable(),
    bonCommandeLineId: z.string().optional().nullable(),
    quantite: z.coerce.number().int().min(1),
    dateDebut: z.string().optional().nullable(),
    dateFin: z.string().optional().nullable(),
    dateLivraison: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    details: z.array(z.object({
        variantId: z.string(),
        variantNom: z.string(),
        taille: z.string().default(""),
        couleur: z.string().default(""),
        quantite: z.coerce.number().int().min(0),
        quantiteProduite: z.coerce.number().int().min(0).default(0),
    })).optional().nullable(),
});

export type OrdreFabricationInput = z.infer<typeof ordreFabricationSchema>;
