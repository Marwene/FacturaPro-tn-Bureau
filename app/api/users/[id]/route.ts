import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendMail, buildStatusChangeEmail } from "@/lib/mail";
import { apiRoute } from "@/lib/api-route";
import { invalidateUserSessionCache } from "@/lib/session-cache";
import { updateUserSchema } from "@/lib/schemas/user";
import type { Prisma } from "@/prisma/generated/prisma/client";

// justifié : aucune PermissionKey groupe « utilisateurs » n'existe (hors
// PERMISSION_GROUPS) — le GET ne porte AUCUN check de rôle dans le handler
// (observation IDOR remontée au Governor, cf. audit-scope-multi-societe §7.4).
export const GET = apiRoute.get({ authOnly: true }, async (_request, { params }) => {
    const { id } = params;
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            permissions: true,
            actif: true,
            emailVerified: true,
            image: true,
            companyId: true,
            createdAt: true,
            company: { select: { id: true, name: true } },
            userCompanies: {
                select: {
                    company: { select: { id: true, name: true } },
                },
            },
        },
    });

    if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    return NextResponse.json({ user });
});

// justifié : aucune PermissionKey groupe « utilisateurs » n'existe — le contrôle
// (rôle ADMIN) est vérifié dans le handler ci-dessous.
export const PATCH = apiRoute.patch({ authOnly: true, schema: updateUserSchema }, async (_request, { params, session, body }) => {
    if (session.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;

    const data: Prisma.UserUpdateInput = {};
    if (body.name) data.name = body.name;
    if (body.email) data.email = body.email;
    if (body.role) data.role = body.role;
    if (body.permissions) data.permissions = body.permissions;
    if (body.actif !== undefined) data.actif = body.actif;
    if (body.password) {
        data.passwordHash = await bcrypt.hash(body.password, 12);
    }

    // Handle company assignments
    if (body.companyIds && Array.isArray(body.companyIds)) {
        // Replace all company assignments
        await prisma.userCompany.deleteMany({ where: { userId: id } });
        if (body.companyIds.length > 0) {
            await prisma.userCompany.createMany({
                data: body.companyIds.map((cid: string) => ({ userId: id, companyId: cid })),
            });
        }
    }

    const user = await prisma.user.update({
        where: { id },
        data,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            actif: true,
            emailVerified: true,
            createdAt: true,
        },
    });

    // Propage immédiatement actif/role/permissions (cache session ≤ 30 s)
    invalidateUserSessionCache(id);

    // Send email notification on status change
    if (body.actif !== undefined && user.email) {
        const { subject, html } = buildStatusChangeEmail(user.name || "Utilisateur", user.actif);
        sendMail({ to: user.email, subject, html });
    }

    return NextResponse.json({ user });
});

// justifié : aucune PermissionKey groupe « utilisateurs » n'existe — le contrôle
// (rôle ADMIN) est vérifié dans le handler ci-dessous.
export const DELETE = apiRoute.delete({ authOnly: true }, async (_request, { params, session }) => {
    if (session.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = params;
    if (id === session.id) {
        return NextResponse.json(
            { error: "Vous ne pouvez pas supprimer votre propre compte" },
            { status: 400 }
        );
    }

    await prisma.user.delete({ where: { id } });
    invalidateUserSessionCache(id);
    return NextResponse.json({ success: true });
});
