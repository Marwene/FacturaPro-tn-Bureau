import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { invalidateUserSessionCache } from "@/lib/session-cache";
import { companySetupSchema } from "@/lib/schemas/company";

// POST - Création de la première société (onboarding, uniquement si aucune société n'est associée)
// justifié : onboarding AVANT l'existence d'une société — aucune PermissionKey
// n'est attribuable ici (aucune société/périmètre encore), et `requireCompany`
// reste INTERDIT (le wrapper ne doit pas appeler resolveCompanyId).
export const POST = apiRoute.post({ authOnly: true, schema: companySetupSchema }, async (_request, { session, body }) => {
    // L'onboarding société ne se fait qu'une seule fois, au tout premier lancement
    if (session.companyId) {
        return NextResponse.json(
            errorResponse("Votre société est déjà configurée"),
            { status: 400 }
        );
    }

    const company = await prisma.$transaction(async (tx) => {
        const created = await tx.company.create({
            data: {
                name: body.name,
                matriculeFiscal: body.matriculeFiscal || undefined,
                adresse: body.adresse || undefined,
                ville: body.ville || undefined,
                codePostal: body.codePostal || undefined,
                telephone: body.telephone || undefined,
                email: body.email || undefined,
                siteWeb: body.siteWeb || undefined,
                ribBancaire: body.ribBancaire || undefined,
                banque: body.banque || undefined,
                type: body.type ?? "LOCALE",
                devise: body.devise ?? "TND",
                tauxTVADefaut: body.tauxTVADefaut?.toString() ?? "19",
                tauxFodecDefaut: body.tauxFodecDefaut?.toString() ?? "1",
                prefixeFacture: body.prefixeFacture ?? "FAC",
                prefixeDevis: body.prefixeDevis ?? "DEV",
                prefixeBL: body.prefixeBL ?? "BL",
                anneeFormat: body.anneeFormat ?? true,
            },
        });

        // Associe la société comme société principale + membre
        await tx.user.update({
            where: { id: session.id },
            data: {
                companyId: created.id,
                userCompanies: {
                    create: [{ companyId: created.id }],
                },
            },
        });

        return created;
    });

    invalidateUserSessionCache(session.id);

    return NextResponse.json(
        { company: serializeDecimals(company) },
        { status: 201 }
    );
});
