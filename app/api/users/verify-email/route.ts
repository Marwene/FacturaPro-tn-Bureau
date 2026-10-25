import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { verifyEmailSchema } from "@/lib/schemas/auth";
import {
    clientIp,
    consumeRateLimit,
    rateLimitKey,
    rateLimitResponse,
    VERIFY_EMAIL_EMAIL_LIMIT,
    VERIFY_EMAIL_IP_LIMIT,
} from "@/lib/rate-limit";
import { invalidateUserSessionCache } from "@/lib/session-cache";

export async function POST(request: NextRequest) {
    // Rate limit PAR IP (15 / 15 min) — avant toute requête DB.
    const ipDecision = await consumeRateLimit(
        rateLimitKey("verify-email", "ip", clientIp(request)),
        VERIFY_EMAIL_IP_LIMIT
    );
    if (!ipDecision.ok) return rateLimitResponse(ipDecision);

    try {
        // Route PUBLIQUE (pré-auth) : ne peut pas passer par le wrapper `apiRoute`
        // (401 systématique) — validation manuelle avec le même contrat 422
        // `{ error, issues, success: false }` que le wrapper (lot E2a).
        const parsed = verifyEmailSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { ...errorResponse("Données invalides"), issues: parsed.error.issues },
                { status: 422 }
            );
        }
        const { email, code } = parsed.data;

        // Rate limit PAR EMAIL (10 / 15 min) — avant toute requête DB et la
        // comparaison du code.
        const emailDecision = await consumeRateLimit(
            rateLimitKey("verify-email", "email", String(email)),
            VERIFY_EMAIL_EMAIL_LIMIT
        );
        if (!emailDecision.ok) return rateLimitResponse(emailDecision);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }
        if (user.emailVerified) {
            return NextResponse.json({ message: "Email déjà vérifié" }, { status: 200 });
        }
        if (user.verificationCode !== code) {
            return NextResponse.json({ error: "Code invalide" }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                verificationCode: null,
            },
        });
        invalidateUserSessionCache(user.id);

        return NextResponse.json({ message: "Email vérifié avec succès" });
    } catch (error) {
        console.error("[verify-email/POST]", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
