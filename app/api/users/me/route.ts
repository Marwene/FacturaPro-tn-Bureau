import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { invalidateUserSessionCache } from "@/lib/session-cache";
import { meUpdateSchema } from "@/lib/schemas/user";

// GET - Get current user profile
// justifié : profil de l'utilisateur COURANT, scopé `session.id` — aucune
// PermissionKey pertinente (donnée personnelle).
export const GET = apiRoute.get({ authOnly: true }, async (_request, { session }) => {
    const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            companyId: true,
            createdAt: true,
            company: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json({ user });
});

// PATCH - Update current user profile
// justifié : profil de l'utilisateur COURANT, scopé `session.id` — aucune
// PermissionKey pertinente (donnée personnelle).
export const PATCH = apiRoute.patch({ authOnly: true, schema: meUpdateSchema }, async (_request, { session, body }) => {
    const user = await prisma.user.update({
        where: { id: session.id },
        data: {
            name: body.name,
            email: body.email,
        },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
        },
    });

    invalidateUserSessionCache(session.id);

    return NextResponse.json({ user });
});
