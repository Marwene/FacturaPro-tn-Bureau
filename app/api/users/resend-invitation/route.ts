import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendMail, buildInvitationEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { apiRoute } from "@/lib/api-route";
import { invalidateUserSessionCache } from "@/lib/session-cache";
import { resendInvitationSchema } from "@/lib/schemas/user";

// justifié : aucune PermissionKey groupe « utilisateurs » n'existe — le contrôle
// (rôle ADMIN) est vérifié dans le handler ci-dessous.
export const POST = apiRoute.post({ authOnly: true, schema: resendInvitationSchema }, async (_request, { session, body }) => {
    if (session.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { userId, password } = body;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, passwordHash: true },
    });
    if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const newPassword = password || crypto.randomBytes(4).toString("hex"); // 8-char fallback
    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashed, emailVerified: null, verificationCode: null },
    });
    invalidateUserSessionCache(userId);

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;
    if (user.email) {
        const { subject, html } = buildInvitationEmail(user.name || "Utilisateur", user.email, newPassword, loginUrl);
        await sendMail({ to: user.email, subject, html });
    }

    return NextResponse.json({ success: true });
});
