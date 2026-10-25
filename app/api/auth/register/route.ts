import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hasAdmin } from "@/lib/bootstrap";
import { sendMail, buildVerificationEmail } from "@/lib/mail";
import { errorResponse } from "@/lib/schemas";
import { registerSchema } from "@/lib/schemas/auth";
import {
    clientIp,
    consumeRateLimit,
    rateLimitKey,
    rateLimitResponse,
    REGISTER_IP_LIMIT,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
    // Rate limit PAR IP (5 inscriptions / heure) — avant le parsing du body
    // et toute requête DB.
    const decision = await consumeRateLimit(
        rateLimitKey("register", "ip", clientIp(request)),
        REGISTER_IP_LIMIT
    );
    if (!decision.ok) return rateLimitResponse(decision);

    try {
        // Route PUBLIQUE (pré-auth) : ne peut pas passer par le wrapper `apiRoute`
        // (401 systématique) — validation manuelle avec le même contrat 422
        // `{ error, issues, success: false }` que le wrapper (lot E2a).
        const parsed = registerSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { ...errorResponse("Données invalides"), issues: parsed.error.issues },
                { status: 422 }
            );
        }
        const { name, email, password } = parsed.data;

        // L'inscription publique n'est possible que lors du bootstrap (aucun administrateur).
        // Ensuite, seuls les administrateurs créent les utilisateurs et les invitent.
        if (await hasAdmin()) {
            return NextResponse.json(
                { error: "L'inscription est fermée. Contactez votre administrateur." },
                { status: 403 }
            );
        }

        const existing = await prisma.user.findUnique({
            where: { email },
        });

        if (existing) {
            return NextResponse.json(
                { error: "Un compte avec cet email existe déjà" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();
        const emailNormalized = email.trim().toLowerCase();

        // Bootstrap : création du premier compte administrateur SANS entreprise.
        // La société sera créée après la vérification de l'email, à la première connexion.
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: emailNormalized,
                passwordHash: hashedPassword,
                role: "ADMIN",
                verificationCode,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                actif: true,
                createdAt: true,
            },
        });

        const { subject, html } = buildVerificationEmail(user.name ?? "", verificationCode);
        const emailSent = await sendMail({ to: emailNormalized, subject, html });

        return NextResponse.json(
            {
                user,
                emailSent,
                // Fallback dev : si SMTP n'est pas configuré, exposer le code pour ne pas bloquer l'onboarding
                ...(emailSent ? {} : { verificationCode }),
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("[register/POST]", error);
        const errorDetail = error instanceof Error ? error.message : "Erreur inconnue";
        return NextResponse.json(
            { error: "Erreur serveur", detail: errorDetail },
            { status: 500 }
        );
    }
}