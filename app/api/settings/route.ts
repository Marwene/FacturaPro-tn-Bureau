import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { apiRoute } from "@/lib/api-route";
import { companySettingsUpdateSchema } from "@/lib/schemas/company";

export const GET = apiRoute.get(
    { permission: "parametres:voir", requireCompany: true },
    async (_request, { companyId }) => {
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) return NextResponse.json({ error: "Société introuvable" }, { status: 400 });
        return { settings: serializeDecimals(company) };
    },
);

export const PUT = apiRoute.put(
    { permission: "parametres:modifier", requireCompany: true, schema: companySettingsUpdateSchema },
    async (_request, { companyId, body }) => {
        const existing = await prisma.company.findUnique({ where: { id: companyId } });
        if (!existing) return NextResponse.json({ error: "Société introuvable" }, { status: 400 });
        const data = {
            name: body.name ?? existing?.name ?? "",
            matriculeFiscal: body.matriculeFiscal ?? existing?.matriculeFiscal,
            adresse: body.adresse ?? existing?.adresse,
            ville: body.ville ?? existing?.ville,
            codePostal: body.codePostal ?? existing?.codePostal,
            telephone: body.telephone ?? existing?.telephone,
            email: body.email ?? existing?.email,
            siteWeb: body.siteWeb ?? existing?.siteWeb,
            ribBancaire: body.ribBancaire ?? existing?.ribBancaire,
            banque: body.banque ?? existing?.banque,
            tauxTVADefaut: body.tauxTVADefaut?.toString() ?? existing?.tauxTVADefaut?.toString() ?? "19",
            tauxFodecDefaut: body.tauxFodecDefaut?.toString() ?? existing?.tauxFodecDefaut?.toString() ?? "1",
            prefixeFacture: body.prefixeFacture ?? existing?.prefixeFacture ?? "FAC",
            prefixeDevis: body.prefixeDevis ?? existing?.prefixeDevis ?? "DEV",
            prefixeBL: body.prefixeBL ?? existing?.prefixeBL ?? "BL",
            anneeFormat: body.anneeFormat ?? existing?.anneeFormat ?? true,
        };
        const company = existing
            ? await prisma.company.update({ where: { id: existing.id }, data })
            : await prisma.company.create({ data });
        return { settings: serializeDecimals(company) };
    },
);
