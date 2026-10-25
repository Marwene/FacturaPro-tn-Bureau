import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { maskAppSettingsKeys } from "@/lib/api-keys";
import { preparerClePourStockage } from "@/lib/api-keys-crypto";
import { appSettingsUpdateSchema } from "@/lib/schemas/settings";

// GET - Fetch app settings — TOUTES les colonnes de clés masquées (les 4 de
// DB_KEY_MAP, `openrouterApiKey` comprise : fuite corrigée lot E3). Le masquage
// s'applique à la valeur STOCKÉE (chiffrée ou non) : aucune clé de chiffrement
// nécessaire, donc aucun risque de 500 et aucune valeur en clair exposée.
export const GET = apiRoute.get(
    { permission: "parametres:voir", requireCompany: false },
    async () => {
        let settings = await prisma.appSettings.findFirst();
        if (!settings) {
            settings = await prisma.appSettings.create({ data: {} });
        }

        return { settings: maskAppSettingsKeys(settings) };
    },
);

// PUT - Update app settings (stores actual keys) :
//   - Zod sur le body (Annexe A) : 422 homogène `{ error, issues, success:false }` ;
//   - garde-fou `••••` : les valeurs masquées renvoyées par GET sont IGNORÉES
//     (`preparerClePourStockage` → `undefined`) — la vraie clé n'est jamais
//     écrasée par le masque du formulaire ;
//   - chiffrement AES-256-GCM au repos si `APP_KEYS_ENCRYPTION_KEY` est posée,
//     sinon repli en clair documenté (logger.warn) — cf. lib/api-keys-crypto.ts ;
//   - réponse masquée : AUCUNE clé en clair ne sort (jamais `{ settings }` brut).
export const PUT = apiRoute.put(
    {
        permission: "parametres:modifier",
        requireCompany: false,
        schema: appSettingsUpdateSchema,
    },
    async (_request, { body }) => {
        let settings = await prisma.appSettings.findFirst();

        if (!settings) {
            settings = await prisma.appSettings.create({ data: {} });
        }

        settings = await prisma.appSettings.update({
            where: { id: settings.id },
            data: {
                alerteStockActif: body.alerteStockActif,
                alerteEcheanceJours: body.alerteEcheanceJours,
                openaiApiKey: preparerClePourStockage(body.openaiApiKey),
                geminiApiKey: preparerClePourStockage(body.geminiApiKey),
                mistralApiKey: preparerClePourStockage(body.mistralApiKey),
                // Le formulaire enregistre aussi OpenRouter (register + envoi) :
                // l'ancien PUT l'ignorait — colonne désormais écrite, gardée et
                // masquée comme les autres.
                openrouterApiKey: preparerClePourStockage(body.openrouterApiKey),
            },
        });

        return { settings: maskAppSettingsKeys(settings) };
    },
);
