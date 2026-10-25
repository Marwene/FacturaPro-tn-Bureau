import { z } from "zod";

export const fournisseurSchema = z.object({
    code: z.string().min(1, "Code requis").max(10),
    raisonSociale: z.string().min(2, "Raison sociale requise"),
    matriculeFiscal: z.string().optional().nullable(),
    adresse: z.string().optional().nullable(),
    ville: z.string().optional().nullable(),
    codePostal: z.string().optional().nullable(),
    telephone: z.string().optional().nullable(),
    email: z.string().email("Email invalide").optional().nullable().or(z.literal("")),
    siteWeb: z.string().optional().nullable(),
    contactNom: z.string().optional().nullable(),
    contactFonction: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    actif: z.boolean().default(true),
    isClient: z.boolean().default(false),
});

export type FournisseurInput = z.infer<typeof fournisseurSchema>;
