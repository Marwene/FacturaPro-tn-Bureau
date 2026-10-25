import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendMail, buildVerificationEmail } from "@/lib/mail";
import { errorResponse } from "@/lib/schemas";
import { resendCodeSchema } from "@/lib/schemas/auth";
import {
    clientIp,
    consumeRateLimit,
    rateLimitKey,
    rateLimitResponse,
    RESEND_CODE_EMAIL_LIMIT,
    RESEND_CODE_IP_LIMIT,
} from "@/lib/rate-limit";

// POST - Renvoie un nouveau code de vérification par email
export async function POST(request: NextRequest) {
    try {
        // Rate limit PAR IP (10 / heure) — avant le parsing du body et toute
        // requête DB ou envoi de mail (un corps malformé ou vide compte aussi,
        // comme sur register / verify-email / check-status).
        const ipDecision = await consumeRateLimit(
            rateLimitKey("resend-code", "ip", clientIp(request)),
            RESEND_CODE_IP_LIMIT
        );
        if (!ipDecision.ok) return rateLimitResponse(ipDecision);

        // Route PUBLIQUE (pré-auth) : ne peut pas passer par le wrapper `apiRoute`
        // (401 systématique) — validation manuelle avec le même contrat 422
        // `{ error, issues, success: false }` que le wrapper (lot E2a).
        const parsed = resendCodeSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { ...errorResponse("Données invalides"), issues: parsed.error.issues },
                { status: 422 }
            );
        }
        const { email } = parsed.data;

        // Rate limit PAR EMAIL (5 / heure) — après parsing du body (il en a
        // besoin), avant DB / envoi de mail.
        const emailDecision = await consumeRateLimit(
            rateLimitKey("resend-code", "email", String(email)),
            RESEND_CODE_EMAIL_LIMIT
        );
        if (!emailDecision.ok) return rateLimitResponse(emailDecision);

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, emailVerified: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Aucun compte trouvé avec cet email" },
                { status: 404 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { error: "Cet email est déjà vérifié" },
                { status: 400 }
            );
        }

        const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();

        await prisma.user.update({
            where: { id: user.id },
            data: { verificationCode },
        });

        const { subject, html } = buildVerificationEmail(user.name ?? "", verificationCode);
        const emailSent = await sendMail({ to: email, subject, html });

        return NextResponse.json({
            emailSent,
            // Fallback dev : si SMTP n'est pas configuré, exposer le code
            ...(emailSent ? {} : { verificationCode }),
        });
    } catch (error) {
        console.error("[auth/resend-code/POST]", error);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}