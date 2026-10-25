import { z } from "zod";

// ─── Codes NGP (catalogue) — schémas des routes `app/api/ngp-codes/**` ────────
// Lot E2a (Annexe A) : config `schema` du wrapper `apiRoute` — parse avant
// handler, 422 en cas d'échec, STRIP des clés inconnues (S-7). `barcode` et
// `description` restent nullish : le handler régénère le barcode depuis le code
// quand il est absent, et stocke `null` pour une description vide.

/** POST /api/ngp-codes — création (duplication `code` gérée en 409 dans le handler). */
export const ngpCodeCreateSchema = z.object({
    code: z.string().min(1, "Code NGP requis"),
    barcode: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
});

export type NgpCodeCreateInput = z.infer<typeof ngpCodeCreateSchema>;

/** PATCH /api/ngp-codes/[id] — mise à jour partielle (`code` vide désormais rejeté en 422, avant : écrit en base). */
export const ngpCodeUpdateSchema = z.object({
    code: z.string().min(1, "Code NGP requis").optional(),
    barcode: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
});

export type NgpCodeUpdateInput = z.infer<typeof ngpCodeUpdateSchema>;
