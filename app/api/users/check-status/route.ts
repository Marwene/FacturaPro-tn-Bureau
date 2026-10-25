import { NextRequest, NextResponse } from "next/server";
import {
    CHECK_STATUS_IP_LIMIT,
    clientIp,
    consumeRateLimit,
    rateLimitKey,
    rateLimitResponse,
} from "@/lib/rate-limit";

/**
 * POST /api/users/check-status — **réponse générique** (C2, item 6 / audit S-9).
 *
 * Cette route indiquait si un e-mail existait et s'il était vérifié
 * (`{ deactivated, unverified }`), soit une énumération de comptes en clair
 * avant toute authentification. Elle ne sert **plus au flux de login** (les
 * codes structurés sont désormais portés par `authorize()` via la Server Action
 * de login, cf. `lib/auth-errors.ts`).
 *
 * Elle est conservée (route publique déjà whitelistée — voir `docs/wiki/auth.md`
 * § Rate limiting) mais ne lit **plus jamais** la table `User` : la réponse est
 * la même quelle que soit l'email, existante ou non. Compatible avec la
 * suppression de l'appel côté client (`hooks/use-login.ts`, migré en C3).
 *
 * NOTE `apiRoute` non applicable : route publique par nature (appelée pré-auth ;
 * le wrapper impose `session?.id` → 401). Rien n'est réimplémenté à la main.
 */
export async function POST(request: NextRequest) {
    // Rate limit PAR IP (30 tentatives / 5 min) — avant toute lecture du corps.
    const decision = await consumeRateLimit(
        rateLimitKey("check-status", "ip", clientIp(request)),
        CHECK_STATUS_IP_LIMIT
    );
    if (!decision.ok) return rateLimitResponse(decision);

    // Corps lu (et comptabilisé dans la limite IP en cas de corps malformé,
    // parité historique) mais volontairement non exploité : aucun état de
    // compte n'est renvoyé avant authentification.
    await request.json().catch(() => null);

    return NextResponse.json({ ok: true });
}
