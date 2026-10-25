/// lib/cron-auth.ts
// Garde d'authentification des routes `app/api/cron/*` — lot E4 (Prompt E,
// audit §3 S-8, exigence 5 « Crons »).
//
// POURQUOI PAS le wrapper `lib/api-route.ts` : ces routes n'ont JAMAIS de
// session → `createHandler` renverrait un 401 permanent et tuerait le cron
// (Option C1, décision utilisateur du 2026-09-28, `docs/wiki/dashboard-rapports.md`
// § Whitelist `cron/*`). Elles portent donc leur propre garde « échec
// fermé », au même titre que les routes publiques `auth/*` durcies en E2a.
// `lib/api-route.ts` n'est pas modifié.
//
// CONTRATS (audit S-8) :
//   1. ÉCHEC FERMÉ : `CRON_SECRET` absente OU header `authorization` différent
//      de `Bearer <valeur attendue>` → 401 **avant toute lecture/écriture DB**
//      (la garde est la première instruction de chaque handler). L'ancien
//      motif `CRON_SECRET && auth !== …` laissait la route OUVERTE quand la
//      variable n'était pas posée.
//   2. PAS DE FUITE : la réponse de refus est **strictement identique** dans
//      les deux causes (secret absent / header invalide) → ni la valeur du
//      secret ni l'état de la configuration ne sortent côté protocole. Seul le
//      log serveur distingue les deux causes, et n'écrit jamais la valeur.
//   3. Comparaison à TEMPS CONSTANT (empreinte sha256 + `timingSafeEqual`) :
//      ni la longueur ni le contenu du secret ne sont déductibles par
//      chronométrage.
//   4. `process.env.CRON_SECRET` est relu à CHAQUE appel (jamais capturé à
//      l'import) : la garde suit la configuration réelle du process et reste
//      testable sans re-import de module (`lib/__tests__/cron-auth.test.ts`).
//
// Zéro ligne de `lib/api-route.ts` modifiée ; `vercel.json` inchangé ;
// aucun secret en dur (la valeur vient uniquement de l'environnement).

import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/schemas";
import { logger } from "@/lib/logger";

/** Message de refus CLIENT : identique quelle que soit la cause (aucune fuite). */
const REFUSAL_MESSAGE = "Non autorisé";

/**
 * Empreinte sha256 d'une chaîne : les digests font toujours 32 octets, ce qui
 * rend `timingSafeEqual` applicable quelle que soit la taille des entrées
 * (longueur du header, longueur du secret) sans fuite de longueur.
 */
function fingerprint(value: string): Buffer {
    return createHash("sha256").update(value, "utf8").digest();
}

/** Le header doit être EXACTEMENT `Bearer <secret>` — comparaison à temps constant. */
function isBearerSecret(header: string | null, secret: string): boolean {
    if (header === null) return false;
    return timingSafeEqual(fingerprint(header), fingerprint(`Bearer ${secret}`));
}

/**
 * Garde d'authentification d'une route `app/api/cron/*` (échec fermé).
 *
 * @param request requête entrante (header `authorization` lu ici).
 * @param routeTag tag de log serveur, ex. `"check-echeances"`.
 * @returns `null` si l'appel est autorisé (le handler continue), sinon la
 *          réponse 401 à retourner **immédiatement**, avant tout accès DB.
 *
 * Le type (`NextResponse | null`) rend l'oubli du `return` impossible au
 * compile-time : `const refused = guardCronRequest(...); if (refused) return refused;`.
 */
export function guardCronRequest(request: NextRequest, routeTag: string): NextResponse | null {
    const secret = process.env.CRON_SECRET;
    const header = request.headers.get("authorization");

    if (!secret || !isBearerSecret(header, secret)) {
        // Log SERVEUR uniquement : on distingue les deux causes SANS jamais
        // écrire la valeur du secret ni le header reçu.
        logger.warn(`[cron/${routeTag}] appel refusé`, {
            cause: !secret ? "secret-non-configuré" : "header-autorisation-invalide",
        });
        return NextResponse.json(errorResponse(REFUSAL_MESSAGE), { status: 401 });
    }

    return null;
}
