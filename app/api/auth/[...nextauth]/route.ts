import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import {
    clientIp,
    consumeRateLimit,
    NEXTAUTH_IP_LIMIT,
    rateLimitKey,
    rateLimitResponse,
} from "@/lib/rate-limit";

export const GET = handlers.GET;

/**
 * POST — limite les tentatives de connexion par IP (15 / 5 min) AVANT de
 * déléguer au handler NextAuth (CSRF + callbacks intacts : la requête est
 * transmise inchangée). La limite par compte est appliquée dans
 * `authorize()` (`lib/auth.ts`).
 */
export async function POST(request: NextRequest): Promise<Response> {
    const decision = await consumeRateLimit(
        rateLimitKey("nextauth", "ip", clientIp(request)),
        NEXTAUTH_IP_LIMIT
    );
    if (!decision.ok) return rateLimitResponse(decision);
    return handlers.POST(request);
}
