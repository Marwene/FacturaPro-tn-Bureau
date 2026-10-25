import { prisma } from "./prisma";

/**
 * Cache mémoire court (par instance serveur) du snapshot minimal nécessaire à
 * l'authentification des routes API : évite 1 requête DB par appel API.
 * TTL ≤ 30 s : un utilisateur désactivé (`actif=false`) ou rétrogradé perd
 * l'accès en moins de 30 s, même sans invalidation explicite.
 */
export interface UserSessionSnapshot {
    actif: boolean;
    role: string;
    permissions: string[];
    /** Date.now() au moment de la lecture DB (ou de la mise en cache). */
    cachedAt: number;
}

/** TTL du cache — imposé par le lot B1 : désactivation/rétrogradation effectives en ≤ 30 s. */
export const USER_SESSION_CACHE_TTL_MS = 30_000;

const userSessionCache = new Map<string, UserSessionSnapshot>();

/**
 * Snapshot {actif, role, permissions} d'un utilisateur, servi depuis le cache
 * si frais (< TTL), sinon relu depuis la base. `null` = utilisateur introuvable.
 */
export async function getUserSessionSnapshot(userId: string): Promise<UserSessionSnapshot | null> {
    const now = Date.now();
    const cached = userSessionCache.get(userId);
    if (cached && now - cached.cachedAt < USER_SESSION_CACHE_TTL_MS) return cached;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { actif: true, role: true, permissions: true },
    });

    if (!user) {
        userSessionCache.delete(userId);
        return null;
    }

    const snapshot: UserSessionSnapshot = {
        actif: user.actif,
        role: user.role,
        permissions: user.permissions,
        cachedAt: now,
    };
    userSessionCache.set(userId, snapshot);
    return snapshot;
}

/**
 * Invalide le cache de session d'un utilisateur.
 * À appeler dès qu'un utilisateur est mis à jour/supprimé (routes app/api/users/**,
 * app/api/setup/company…) pour propager immédiatement actif/role/permissions.
 */
export function invalidateUserSessionCache(userId: string): void {
    userSessionCache.delete(userId);
}

/** Vide entièrement le cache (tests, reset). */
export function clearUserSessionCache(): void {
    userSessionCache.clear();
}
