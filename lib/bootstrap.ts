import { prisma } from "@/lib/prisma";

export async function hasAdmin(): Promise<boolean> {
  const count = await prisma.user.count({ where: { role: "ADMIN" } });
  return count > 0;
}

/**
 * C2 (item 7) — variante cachée de `hasAdmin()` pour le **rendu de la page
 * /login** : un `count()` PostgreSQL à chaque affichage de la page de connexion
 * était inutilement coûteux.
 *
 * Mécanisme : cache **mémoire TTL par module** (asymétrique), et non React
 * `cache()` — la mémoïsation de `cache()` est limitée à une **seule requête**,
 * or chaque visite de /login est une requête distincte : `cache()` ne réduirait
 * donc rien. Un TTL borne la fraîcheur de la donnée affichée.
 *
 * TTL asymétrique (considération bootstrap) :
 *   - `true` (au moins un ADMIN) → 60 s : l'état courant de quasi toutes les
 *     installations, aucune fenêtre sensible ;
 *   - `false` (aucun ADMIN) → 5 s : fenêtre bootstrap uniquement. Courte pour
 *     limiter le staleness sur la transition « premier admin créé » (la page
 *     /login pourrait encore renvoyer /register au maximum 5 s après
 *     l'inscription).
 *
 * `hasAdmin()` (non caché) reste **inchangé** pour `app/api/auth/register` et
 * la page /register : la garde d'inscription (un seul admin bootstrap) doit
 * rester exacte, sans cache.
 */
const ADMIN_EXISTS_TTL_MS = 60 * 1000;
const NO_ADMIN_TTL_MS = 5 * 1000;

let cachedAdminState: { value: boolean; expiresAt: number } | null = null;
let inflight: Promise<boolean> | null = null;

export async function hasAdminCached(): Promise<boolean> {
  if (cachedAdminState && Date.now() < cachedAdminState.expiresAt) {
    return cachedAdminState.value;
  }
  if (inflight) return inflight; // dédoublonnage des requêtes concurrentes

  inflight = hasAdmin()
    .then((value) => {
      cachedAdminState = {
        value,
        expiresAt: Date.now() + (value ? ADMIN_EXISTS_TTL_MS : NO_ADMIN_TTL_MS),
      };
      return value;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Invalidation du cache (tests / mutations bootstrap). */
export function clearHasAdminCache(): void {
  cachedAdminState = null;
}
