import { z } from "zod";

/**
 * Corps des POST/PUT `/api/carton-types` — jadis dupliqué dans les deux routes
 * (helper local `parseCartonType` + `type CartonTypeInput`), d'où une ZodError
 * non convertie qui atterrissait dans le `catch` du wrapper → 500 au lieu du
 * 422 contractuel. Passé au lot E6 via `schema:` dans la config `apiRoute`.
 *
 * À ne pas confondre avec `cartonTypeSchema` (`lib/schemas.ts`, champ `id`
 * requis) : schéma de forme différente, sans consommateur en repo.
 */
export const cartonTypeInputSchema = z.object({
    nom: z.string().min(1, "Nom requis"),
    capacite: z.coerce.number().int().min(1, "Capacité minimale : 1"),
    longueur: z.coerce.number().int().min(0).optional(),
    largeur: z.coerce.number().int().min(0).optional(),
    hauteur: z.coerce.number().int().min(0).optional(),
});
