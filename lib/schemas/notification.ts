import { z } from "zod";

// ─── Notifications — schéma de la route `PATCH /api/notifications` ────────────
// Lot E2a (Annexe A) : config `schema` du wrapper `apiRoute` — parse avant
// handler, 422 en cas d'échec, STRIP des clés inconnues (S-7). Le marquage en
// masse (`all: true`) reste scopé `userId: session.id` dans le handler.

/** PATCH /api/notifications — marquer ses notifications comme lues (par ids ou en masse). */
export const markNotificationsReadSchema = z.object({
    ids: z.array(z.string()).optional(),
    all: z.boolean().optional(),
});

export type MarkNotificationsReadInput = z.infer<typeof markNotificationsReadSchema>;
