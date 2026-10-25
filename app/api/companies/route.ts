import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { companyCreateSchema } from "@/lib/schemas/company";

// GET - List all companies
export const GET = apiRoute.get({ permission: "parametres:voir" }, async () => {
    const companies = await prisma.company.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: { select: { invoices: true } },
        },
    });

    const userCounts = await prisma.$queryRaw<
        Array<{ company_id: string; cnt: bigint }>
    >`
        SELECT company_id, COUNT(DISTINCT user_id) as cnt FROM (
            SELECT u.id as user_id, u."companyId" as company_id FROM "users" u WHERE u."companyId" IS NOT NULL
            UNION ALL
            SELECT uc."userId" as user_id, uc."companyId" as company_id FROM "user_companies" uc
        ) sub
        GROUP BY company_id
    `;

    const userCountMap = Object.fromEntries(
        userCounts.map((r) => [r.company_id, Number(r.cnt)])
    );

    const enriched = companies.map((c) => ({
        ...c,
        _count: { ...c._count, users: userCountMap[c.id] ?? 0 },
    }));

    return NextResponse.json({ companies: serializeDecimals(enriched) });
});

// POST - Create a company (admin only)
// justifié : la règle métier est un check de rôle ADMIN dans le handler (le
// wrapper apiRoute n'a PAS d'option rôle — le check reste ici) et aucune
// PermissionKey n'est adaptée à la création de société (parametres:modifier
// casserait l'onboarding d'un compte existant sans cette clé).
export const POST = apiRoute.post({ authOnly: true, schema: companyCreateSchema }, async (_request, { session, body }) => {
    if (session.role !== "ADMIN") return NextResponse.json(errorResponse("Action réservée aux administrateurs"), { status: 403 });

    const company = await prisma.company.create({
        data: {
            name: body.name,
            matriculeFiscal: body.matriculeFiscal,
            adresse: body.adresse,
            ville: body.ville,
            codePostal: body.codePostal,
            telephone: body.telephone,
            email: body.email,
            siteWeb: body.siteWeb,
            ribBancaire: body.ribBancaire,
            banque: body.banque,
            logo: body.logo,
            type: body.type ?? "LOCALE",
            devise: body.devise ?? "TND",
            deviseDefaut: body.deviseDefaut,
            tauxTVADefaut: body.tauxTVADefaut?.toString() ?? "19",
            tauxFodecDefaut: body.tauxFodecDefaut?.toString() ?? "1",
            prefixeFacture: body.prefixeFacture ?? "FAC",
            prefixeDevis: body.prefixeDevis ?? "DEV",
            prefixeBL: body.prefixeBL ?? "BL",
            anneeFormat: body.anneeFormat ?? true,
        },
    });

    // Link creator to the new company so it appears in CompanySwitcher
    await prisma.userCompany.create({
        data: {
            userId: session.id,
            companyId: company.id,
        },
    });

    return NextResponse.json(
        { company: serializeDecimals(company) },
        { status: 201 }
    );
});
