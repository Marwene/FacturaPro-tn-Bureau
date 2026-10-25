import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";

// justifié : liste des sociétés de l'utilisateur COURANT, scopée `session.id`
// dans le handler — aucune PermissionKey pertinente (donnée personnelle).
export const GET = apiRoute.get({ authOnly: true }, async (_request, { session }) => {
    const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: {
            companyId: true,
            company: {
                select: { id: true, name: true, type: true, devise: true, logo: true },
            },
            userCompanies: {
                select: {
                    company: { select: { id: true, name: true, type: true, devise: true, logo: true } },
                },
            },
        },
    });

    if (!user) {
        return NextResponse.json(errorResponse("Utilisateur introuvable"), { status: 404 });
    }

    const raw = [
        ...(user.company ? [user.company] : []),
        ...user.userCompanies.map((uc) => uc.company),
    ];
    const companies = raw.filter(
        (c, i, a) => a.findIndex((x) => x.id === c.id) === i
    );

    return NextResponse.json({ companies, primaryCompanyId: user.companyId });
});
