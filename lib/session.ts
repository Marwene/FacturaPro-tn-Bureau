import type { JWT } from "next-auth/jwt";
import { prisma } from "./prisma";
import { decodeSessionToken, readSessionTokenFromRequest } from "./session-token";
import { getUserSessionSnapshot } from "./session-cache";

// Miroir des constantes d'inactivité de lib/auth.ts — la règle appliquée dans
// getSessionFromRequest doit rester identique à celle du callback jwt.
const SESSION_INACTIVITY_MS = 30 * 60 * 1000; // 30 min sans "Se souvenir de moi"
const REMEMBER_ME_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000; // 7j avec "Se souvenir de moi"

export interface SessionUser {
  id: string
  role: string
  companyId: string
  permissions: string[]
  allowedCompanyIds?: string[]
}

export type CompanyIdResult =
    | { ok: true; companyId: string }
    | { ok: false; status: number; error: string };

/**
 * Résolution de la société cible **hors requête HTTP** — partagée par la route
 * (`resolveCompanyId`, qui lit le query param) et par les server actions du
 * lot H (aucun `NextRequest` disponible dans une action : la société demandée
 * provient de leurs paramètres d'entrée, et un `companyId` fourni par le client
 * doit rester soumis au **même contrôle d'appartenance** que côté route).
 * Mêmes règles, dans le même ordre : session → companyId principal →
 * `allowedCompanyIds` → table `UserCompany`.
 */
export async function resolveCompanyIdForUser(
    sessionUser: SessionUser | null,
    requestedCompanyId: string | null | undefined
): Promise<CompanyIdResult> {
    if (!sessionUser?.id) return { ok: false, status: 401, error: "Non authentifié" };
    if (!sessionUser?.companyId) return { ok: false, status: 403, error: "Aucune société associée" };

    const targetCompanyId = requestedCompanyId || sessionUser.companyId;

    if (targetCompanyId === sessionUser.companyId) return { ok: true, companyId: targetCompanyId };
    if (sessionUser.allowedCompanyIds?.includes(targetCompanyId)) return { ok: true, companyId: targetCompanyId };

    const membership = await prisma.userCompany.findUnique({
        where: {
            userId_companyId: {
                userId: sessionUser.id,
                companyId: targetCompanyId,
            },
        },
    });

    if (membership) return { ok: true, companyId: targetCompanyId };

    return { ok: false, status: 403, error: "Accès non autorisé à cette société" };
}

export async function resolveCompanyId(
    request: Request,
    sessionUser: SessionUser | null
): Promise<CompanyIdResult> {
    // Garde-fous relus AVANT l'analyse de l'URL (ordre de contrôle inchangé par
    // rapport à l'implémentation d'origine) — `resolveCompanyIdForUser` les
    // rejoue ensuite de façon idempotente.
    if (!sessionUser?.id) return { ok: false, status: 401, error: "Non authentifié" };
    if (!sessionUser?.companyId) return { ok: false, status: 403, error: "Aucune société associée" };

    const url = new URL(request.url);
    return resolveCompanyIdForUser(sessionUser, url.searchParams.get("companyId"));
}

/** @deprecated Use resolveCompanyId instead — returns proper 401/403 status */
export async function getCompanyId(
    request: Request,
    sessionUser: SessionUser | null
): Promise<string | null> {
    const result = await resolveCompanyId(request, sessionUser);
    return result.ok ? result.companyId : null;
}

function readTokenString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function readTokenStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === "string");
}

/** Miroir exact de la règle d'inactivité du callback jwt (lib/auth.ts). */
function isWithinInactivityLimit(token: JWT): boolean {
    const lastActivity = token.lastActivity;
    if (typeof lastActivity !== "number") return true; // pas d'info → pas de blocage (comportement du callback jwt)
    const maxInactivity = token.rememberMe === true ? REMEMBER_ME_INACTIVITY_MS : SESSION_INACTIVITY_MS;
    return Date.now() - lastActivity <= maxInactivity;
}

export async function getSessionFromRequest(request: Request): Promise<SessionUser | null> {
    // S-1 : le salt JWT est dérivé du nom du cookie réellement lu (voir session-token.ts).
    const source = readSessionTokenFromRequest(request);
    if (!source) return null;

    const decoded = await decodeSessionToken(source);
    if (!decoded?.id) return null;

    // S-3 : session expirée par inactivité → même comportement que le callback jwt.
    if (!isWithinInactivityLimit(decoded)) return null;

    // Relecture actif/role/permissions depuis la base avec cache mémoire court (≤ 30 s) :
    // un utilisateur désactivé ou rétrogradé perd l'accès en ≤ 30 s.
    let role: string;
    let permissions: string[];
    try {
        const snapshot = await getUserSessionSnapshot(decoded.id);
        if (!snapshot) return null; // utilisateur supprimé
        if (!snapshot.actif) return null; // utilisateur désactivé
        role = snapshot.role;
        permissions = snapshot.permissions;
    } catch {
        // Lecture DB indisponible : on conserve les valeurs du token (convention du
        // callback jwt qui conserve le token existant si la lecture échoue).
        // Rien n'est mis en cache → nouvelle tentative au prochain appel.
        role = readTokenString(decoded.role);
        permissions = readTokenStringArray(decoded.permissions);
    }

    return {
        id: decoded.id,
        role,
        companyId: readTokenString(decoded.companyId),
        permissions,
        allowedCompanyIds: readTokenStringArray(decoded.allowedCompanyIds),
    };
}
