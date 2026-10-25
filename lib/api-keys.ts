import { prisma } from "./prisma";
import { logger } from "./logger";
import { dechiffrer } from "./api-keys-crypto";

type ApiProvider = "openai" | "gemini" | "mistral" | "openrouter";

const ENV_KEY_MAP: Record<ApiProvider, string> = {
  openai: "OPENAI_API_KEY",
  gemini: "GEMINI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

/**
 * Colonnes `*ApiKey` du modèle `AppSettings` — source unique pilotant :
 *   - la lecture des clés (ci-dessous),
 *   - le masquage exhaustif des réponses (`maskAppSettingsKeys`) :
 *     ajouter une colonne ici la masque partout (fuite `openrouterApiKey`
 *     corrigée lot E3 : elle n'était masquée ni en GET ni en PUT).
 */
export const DB_KEY_MAP: Record<ApiProvider, string> = {
  openai: "openaiApiKey",
  gemini: "geminiApiKey",
  mistral: "mistralApiKey",
  openrouter: "openrouterApiKey",
};

/**
 * Masque une clé pour affichage : `••••••••` + 4 derniers caractères.
 * Appliqué à la valeur STOCKÉE (chiffrée ou non) : aucune lecture de clé de
 * chiffrement nécessaire → aucun risque de 500, aucune donnée sensible exposée.
 */
export function maskApiKey(key: string | null): string | null {
  if (!key) return null;
  if (key.length <= 4) return "••••••••";
  return "••••••••" + key.slice(-4);
}

/**
 * Masque TOUTES les colonnes de clés d'une ligne `AppSettings` (GET et PUT de
 * `/api/settings/app`). Itère sur `DB_KEY_MAP` : le masquage est exhaustif par
 * construction — toute nouvelle colonne de clé listée est masquée sans autre
 * modification. Les autres champs (alertes, dates) sont conservés à l'identique.
 */
export function maskAppSettingsKeys<T extends object>(settings: T): T {
  // Spread + narrowing vers `Record<string, unknown>` : permet d'itérer les
  // colonnes de `DB_KEY_MAP` sans contrainte de forme sur `T` (jamais `any`).
  const masked = { ...settings } as Record<string, unknown>;
  for (const column of Object.values(DB_KEY_MAP)) {
    const current = masked[column];
    if (typeof current === "string" || current === null) {
      masked[column] = maskApiKey(current);
    }
  }
  return masked as T;
}

/**
 * Récupère la clé API pour un provider donné.
 * Priorité : variable d'environnement > base de données.
 * Lecture rétro-compatible des deux états de la colonne (fenêtre de migration
 * lot E3) : valeur chiffrée `enc:v1:…` → déchiffrée ; valeur en clair →
 * retournée telle quelle. Le préfixe décide, jamais une devinette.
 */
export async function getApiKey(provider: ApiProvider): Promise<string | null> {
  const envKey = process.env[ENV_KEY_MAP[provider]];
  if (envKey) {
    return envKey;
  }

  try {
    const settings = await prisma.appSettings.findFirst();
    const dbKey = settings?.[DB_KEY_MAP[provider] as keyof typeof settings];

    if (dbKey && typeof dbKey === "string" && dbKey.length > 0) {
      console.warn(
        `[API KEYS] La clé ${provider} est lue depuis la base de données. ` +
          `Pour plus de sécurité, configurez la variable d'environnement ${ENV_KEY_MAP[provider]}.`
      );
      try {
        return dechiffrer(dbKey);
      } catch (error) {
        // Jamais de propagation : la route ne doit pas tomber en 500 pour une
        // colonne illisible (env retirée après backfill, donnée corrompue…).
        logger.error(
          "[API KEYS] Valeur chiffrée illisible (clé de chiffrement absente ou donnée altérée)",
          {
            provider,
            raison: error instanceof Error ? error.message : "erreur inconnue",
          },
        );
        return null;
      }
    }
  } catch (error) {
    console.error(`[API KEYS] Erreur lecture DB pour ${provider}:`, error);
  }

  return null;
}

/**
 * Vérifie si une clé API est configurée (env var ou DB).
 */
export async function hasApiKey(provider: ApiProvider): Promise<boolean> {
  const key = await getApiKey(provider);
  return key !== null && key.length > 0;
}

/**
 * Retourne le statut de configuration de toutes les clés API.
 * Utile pour l'interface de paramètres. Seuls des booléens/origines sortent :
 * AUCUNE valeur de clé n'est lue ni renvoyée ici.
 */
export async function getApiKeyStatus(): Promise<
  Record<ApiProvider, { configured: boolean; source: "env" | "db" | "none" }>
> {
  const status: Record<ApiProvider, { configured: boolean; source: "env" | "db" | "none" }> = {
    openai: { configured: false, source: "none" },
    gemini: { configured: false, source: "none" },
    mistral: { configured: false, source: "none" },
    openrouter: { configured: false, source: "none" },
  };

  for (const provider of Object.keys(ENV_KEY_MAP) as ApiProvider[]) {
    if (process.env[ENV_KEY_MAP[provider]]) {
      status[provider] = { configured: true, source: "env" };
      continue;
    }

    try {
      const settings = await prisma.appSettings.findFirst();
      const dbKey = settings?.[DB_KEY_MAP[provider] as keyof typeof settings];
      if (dbKey && typeof dbKey === "string" && dbKey.length > 0) {
        status[provider] = { configured: true, source: "db" };
      }
    } catch {
      // Ignorer erreurs DB
    }
  }

  return status;
}
