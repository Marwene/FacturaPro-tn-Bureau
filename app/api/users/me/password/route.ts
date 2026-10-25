import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { apiRoute } from "@/lib/api-route";
import { invalidateUserSessionCache } from "@/lib/session-cache";
import { changePasswordSchema } from "@/lib/schemas/user";

// PATCH - Change password
// justifié : mot de passe de l'utilisateur COURANT, scopé `session.id` +
// vérification du mot de passe actuel dans le handler — aucune PermissionKey
// pertinente (donnée personnelle).
export const PATCH = apiRoute.patch({ authOnly: true, schema: changePasswordSchema }, async (_request, { session, body }) => {
    const { currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
        where: { id: session.id },
    });

    if (!user?.passwordHash) {
        return NextResponse.json(
            { error: "Compte OAuth — modification du mot de passe non disponible" },
            { status: 400 }
        );
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        return NextResponse.json(
            { error: "Mot de passe actuel incorrect" },
            { status: 400 }
        );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: { id: session.id },
        data: { passwordHash: hashedPassword },
    });
    invalidateUserSessionCache(session.id);

    return NextResponse.json({ success: true });
});
