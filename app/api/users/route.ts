import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendMail, buildInvitationEmail } from "@/lib/mail";
import { apiRoute } from "@/lib/api-route";
import { createUserSchema } from "@/lib/schemas/user";

export const GET = apiRoute.get(
    // justifié : aucune PermissionKey groupe « utilisateurs » n'existe — le
    // contrôle (rôle ADMIN) est vérifié dans le handler ci-dessous.
    { authOnly: true, requireCompany: true },
    async (_request, { session, companyId }) => {
        if (session.role !== "ADMIN") {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }
        const where = { companyId };
        const [users, stats] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    permissions: true,
                    actif: true,
                    emailVerified: true,
                    image: true,
                    createdAt: true,
                    company: { select: { id: true, name: true } },
        userCompanies: {
          select: {
            company: { select: { id: true, name: true } },
          },
        },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma.user.aggregate({
                where,
                _count: true,
            }),
        ]);
        const total = stats._count;
        const actifs = users.filter((u) => u.actif).length;
        const inactifs = total - actifs;
        const enAttente = users.filter((u) => !u.emailVerified).length;
        return NextResponse.json({
            users,
            stats: { total, actifs, inactifs, enAttente },
        });
    },
);

export const POST = apiRoute.post(
    // justifié : aucune PermissionKey groupe « utilisateurs » n'existe — le
    // contrôle (rôle ADMIN) est vérifié dans le handler ci-dessous.
    { authOnly: true, requireCompany: true, schema: createUserSchema },
    async (_request, { session, companyId, body }) => {
        if (session.role !== "ADMIN") {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }
        const { name, email, password, role, companyIds, permissions } = body;
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: "Un compte avec cet email existe déjà" },
                { status: 409 }
            );
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationCode = crypto.randomBytes(3).toString("hex").toUpperCase();
        const assignCompanyIds = companyIds && Array.isArray(companyIds) && companyIds.length > 0
            ? companyIds
            : [companyId];
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
                verificationCode,
                role: role === "ADMIN" ? "ADMIN" : "USER",
                permissions: Array.isArray(permissions) ? permissions : [],
                companyId,
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
        if (assignCompanyIds.length > 0) {
            await prisma.userCompany.createMany({
                data: assignCompanyIds.map((cid: string) => ({ userId: user.id, companyId: cid })),
            });
        }
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`;
        const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify-email?email=${encodeURIComponent(email)}`;
        const { subject, html } = buildInvitationEmail(name, email, password, loginUrl, verificationCode, verificationUrl);
        sendMail({ to: email, subject, html });
        return NextResponse.json({ user }, { status: 201 });
    },
);
