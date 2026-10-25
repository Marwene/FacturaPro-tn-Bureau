import { z } from "zod";

export const achatLineSchema = z.object({
    productId: z.string().nullable().optional(),
    description: z.string().min(1, "Description requise"),
    quantite: z.number().positive("Quantité doit être > 0"),
    prixAchat: z.number().min(0, "Prix d'achat doit être ≥ 0"),
    remise: z.number().min(0).max(100).default(0),
    tauxTVA: z.number().default(19),
    createProduct: z.boolean().default(false),
});

export const achatSchema = z.object({
    tiersId: z.string().optional().nullable(),
    createFournisseur: z.boolean().default(false),
    fournisseur: z
        .object({
            raisonSociale: z.string().min(1),
            matriculeFiscal: z.string().nullable().optional(),
            adresse: z.string().nullable().optional(),
            ville: z.string().nullable().optional(),
            telephone: z.string().nullable().optional(),
            email: z.string().nullable().optional(),
        })
        .optional(),
    type: z.enum(["BL", "FACTURE"]).default("FACTURE"),
    dateFacture: z.string().min(1, "Date facture requise"),
    dateEcheance: z.string().nullable().optional(),
    referenceFournisseur: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    blAchatId: z.string().nullable().optional(),
    categorieAchat: z.enum(["MATIERES_PREMIERES", "TENUES_TRAVAIL", "DIVERS"]).nullable().optional(),
    asDraft: z.boolean().default(false),
    timbreFiscal: z.number().min(0).default(0),
    totalHT: z.number().min(0).optional(),
    totalTVA: z.number().min(0).optional(),
    totalTTC: z.number().min(0).optional(),
    lines: z.array(achatLineSchema).min(1, "Au moins une ligne requise"),
});

export type AchatInput = z.infer<typeof achatSchema>;
export type AchatLineInput = z.infer<typeof achatLineSchema>;
