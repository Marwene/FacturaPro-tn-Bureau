import { z } from "zod";

/**
 * Body `PUT /api/settings/app` — lot E3 (Annexe A : dernière route du prompt
 * restée sans schéma, exclue des lots E2a/E2b).
 *
 * Champs réellement lus par la route : les deux alertes + les 4 colonnes de
 * clés API optionnelles (`DB_KEY_MAP` dans `lib/api-keys.ts`).
 *
 * `settingsSchema` (`lib/schemas.ts`) ne convient PAS ici : il décrit les
 * paramètres SOCIÉTÉ (exige `raisonSociale`, prefixes de documents…) et ne
 * contient aucun champ de clé — il reste tel quel, ses chemins d'import
 * (`components/parametres/parametres-client.tsx`) sont inchangés.
 *
 * Sémantique des clés côté route :
 *   - champ absent (`undefined`) → la colonne n'est pas touchée ;
 *   - `null` ou `""`             → la colonne est vidée (effacement explicite) ;
 *   - valeur masquée `••••…`     → filtrée par `preparerClePourStockage`
 *     (jamais réécrite — garde-fou lot E3) ;
 *   - sinon                      → chiffrée AES-256-GCM avant écriture.
 *
 * Bornes d'alerte reprises de `settingsSchema` (cohérence : même validation
 * quelle que soit la route qui les écrit).
 */
export const appSettingsUpdateSchema = z.object({
    alerteStockActif: z.boolean().optional(),
    alerteEcheanceJours: z.coerce.number().int().min(1).max(90).optional(),
    openaiApiKey: z.string().nullable().optional(),
    geminiApiKey: z.string().nullable().optional(),
    mistralApiKey: z.string().nullable().optional(),
    openrouterApiKey: z.string().nullable().optional(),
});

export type AppSettingsUpdateInput = z.infer<typeof appSettingsUpdateSchema>;
