import { z } from "zod";

// ─── Company (société) — schémas partagés par les routes d'identité/paramètres ─
// Lot E2a (Annexe A, groupe identité/paramètres/catalogue) : ces schémas servent
// de config `schema` au wrapper `apiRoute` (`lib/api-route.ts`) — le body est
// parsé avant le handler, échec → 422 `{ error, issues, success: false }`, et
// les clés inconnues sont STRIPées (correction mass-assignment S-7).
//
// Non-régressif par rapport aux payloads réels :
//   - POST /api/companies       ← `create-company-dialog` (strings + `null` sur les vides)
//   - PATCH /api/companies/[id] ← `useUpdateCompany` (tout-string, issu d'un FormData)
//                                 + `facturation-settings-client` (taux en number,
//                                 `NaN` → `null` via JSON.stringify)
//   - PUT /api/settings         ← `parametres-client` (`SettingsInput` : taux en number,
//                                 `anneeFormat` boolean ; n'envoie JAMAIS `name`)
//   - POST /api/setup/company   ← `company-setup-form` (strings, `anneeFormat` boolean)
// D'où les unions permissives sur les taux (`string | number | null` sans coercion :
// `z.coerce.number()` transformerait un `null` en `0` et casserait le fallback
// `?? existing` / `?? "19"`), et le pass-through `string | number` de
// `seuilSplitEffet` (Decimal Prisma, envoyé en string par le formulaire détail).

/** Champs `Company` communs — tous optionnels : `undefined` = inchangé (update) ou fallback handler (create). */
const companyBaseFields = {
    name: z.string().optional(),
    matriculeFiscal: z.string().optional(),
    adresse: z.string().optional(),
    ville: z.string().optional(),
    codePostal: z.string().optional(),
    telephone: z.string().optional(),
    email: z.string().optional(),
    siteWeb: z.string().optional(),
    ribBancaire: z.string().optional(),
    banque: z.string().optional(),
    tauxTVADefaut: z.union([z.string(), z.number(), z.null()]).optional(),
    tauxFodecDefaut: z.union([z.string(), z.number(), z.null()]).optional(),
    prefixeFacture: z.string().optional(),
    prefixeDevis: z.string().optional(),
    prefixeBL: z.string().optional(),
    anneeFormat: z.boolean().optional(),
} satisfies z.ZodRawShape;

const companyTypeSchema = z.enum(["LOCALE", "OFFSHORE"]);

/** POST /api/companies — `name` requis, `type`/`devise` defaultnés (les fallbacks du handler sont conservés). */
export const companyCreateSchema = z.object({
    ...companyBaseFields,
    name: z.string().min(1, "Le nom est requis"),
    logo: z.string().optional().nullable(),
    type: companyTypeSchema.default("LOCALE"),
    devise: z.string().default("TND"),
    deviseDefaut: z.string().optional().nullable(),
});

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;

/** PATCH /api/companies/[id] — lecture exhaustive du handler (dont `logo`, `actif`, `seuilSplitEffet`). */
export const companyUpdateSchema = z.object({
    ...companyBaseFields,
    logo: z.string().optional().nullable(),
    type: companyTypeSchema.optional(),
    devise: z.string().optional(),
    deviseDefaut: z.string().optional().nullable(),
    actif: z.boolean().optional(),
    seuilSplitEffet: z.union([z.string(), z.number()]).optional(),
});

export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;

/** PUT /api/settings — sous-ensemble réellement lu par la route (les clés `type`/`logo`/… y seraient ignorées : stripées). */
export const companySettingsUpdateSchema = z.object(companyBaseFields);

export type CompanySettingsUpdateInput = z.infer<typeof companySettingsUpdateSchema>;

/** POST /api/setup/company — create sans `logo`/`deviseDefaut` (jamais lus par la route d'onboarding). */
export const companySetupSchema = z.object({
    ...companyBaseFields,
    name: z.string().min(1, "Le nom est requis"),
    type: companyTypeSchema.default("LOCALE"),
    devise: z.string().default("TND"),
});

export type CompanySetupInput = z.infer<typeof companySetupSchema>;
