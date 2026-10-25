import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { companyUpdateSchema } from "@/lib/schemas/company";

// GET - Get company by ID
export const GET = apiRoute.get({ permission: "parametres:voir" }, async (_request, { params }) => {
    const { id } = params;
    const company = await prisma.company.findUnique({
        where: { id },
        include: {
            _count: { select: { invoices: true, users: true, userCompanies: true } },
        },
    });

    if (!company) {
        return NextResponse.json(
            { error: "Entreprise introuvable" },
            { status: 404 }
        );
    }

    return NextResponse.json({ company: serializeDecimals(company) });
});

// PATCH - Update company
export const PATCH = apiRoute.patch({ permission: "parametres:modifier", schema: companyUpdateSchema }, async (_request, { params, body }) => {
    const { id } = params;

    const company = await prisma.company.update({
        where: { id },
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
            type: body.type,
            devise: body.devise,
            deviseDefaut: body.deviseDefaut,
            tauxTVADefaut: body.tauxTVADefaut?.toString(),
            tauxFodecDefaut: body.tauxFodecDefaut?.toString(),
            prefixeFacture: body.prefixeFacture,
            prefixeDevis: body.prefixeDevis,
            prefixeBL: body.prefixeBL,
            anneeFormat: body.anneeFormat,
            actif: body.actif,
            seuilSplitEffet: body.seuilSplitEffet,
        },
    });

    return NextResponse.json({ company: serializeDecimals(company) });
});

// DELETE - Delete company
export const DELETE = apiRoute.delete({ permission: "parametres:modifier" }, async (_request, { params }) => {
    const { id } = params;

    // Vérification des enregistrements liés avant suppression
    const [
        invoiceCount,
        quoteCount,
        chequeCount,
        effetCount,
        exportCount,
        paymentCount,
        achatCount,
        avoirCount,
        bonCommandeCount,
        bonLivraisonCount,
        packingListCount,
        ordreFabricationCount,
        matierePremiereCount,
        mouvementFinancierCount,
        ngpCodeCount,
        bankAccountCount,
        designCount,
        cartonTypeCount,
        userCompanyCount,
        userCount,
    ] = await Promise.all([
        prisma.invoice.count({ where: { companyId: id } }),
        prisma.quote.count({ where: { companyId: id } }),
        prisma.cheque.count({ where: { companyId: id } }),
        prisma.effet.count({ where: { companyId: id } }),
        prisma.export.count({ where: { companyId: id } }),
        prisma.payment.count({ where: { companyId: id } }),
        prisma.achat.count({ where: { companyId: id } }),
        prisma.avoir.count({ where: { companyId: id } }),
        prisma.bonCommande.count({ where: { companyId: id } }),
        prisma.bonLivraison.count({ where: { companyId: id } }),
        prisma.packingList.count({ where: { companyId: id } }),
        prisma.ordreFabrication.count({ where: { companyId: id } }),
        prisma.matierePremiere.count({ where: { companyId: id } }),
        prisma.mouvementFinancier.count({ where: { companyId: id } }),
        prisma.ngpCode.count({ where: { companyId: id } }),
        prisma.companyBankAccount.count({ where: { companyId: id } }),
        prisma.designPersonnalise.count({ where: { companyId: id } }),
        prisma.cartonType.count({ where: { companyId: id } }),
        prisma.userCompany.count({ where: { companyId: id } }),
        prisma.user.count({ where: { companyId: id } }),
    ]);

    const blockers: string[] = [];
    if (invoiceCount > 0) blockers.push(`${invoiceCount} facture(s)`);
    if (quoteCount > 0) blockers.push(`${quoteCount} devis`);
    if (chequeCount > 0) blockers.push(`${chequeCount} chèque(s)`);
    if (effetCount > 0) blockers.push(`${effetCount} effet(s)`);
    if (exportCount > 0) blockers.push(`${exportCount} export(s)`);
    if (paymentCount > 0) blockers.push(`${paymentCount} paiement(s)`);
    if (achatCount > 0) blockers.push(`${achatCount} achat(s)`);
    if (avoirCount > 0) blockers.push(`${avoirCount} avoir(s)`);
    if (bonCommandeCount > 0) blockers.push(`${bonCommandeCount} bon(s) de commande`);
    if (bonLivraisonCount > 0) blockers.push(`${bonLivraisonCount} bon(s) de livraison`);
    if (packingListCount > 0) blockers.push(`${packingListCount} packing list(s)`);
    if (ordreFabricationCount > 0) blockers.push(`${ordreFabricationCount} ordre(s) de fabrication`);
    if (matierePremiereCount > 0) blockers.push(`${matierePremiereCount} matière(s) première(s)`);
    if (mouvementFinancierCount > 0) blockers.push(`${mouvementFinancierCount} mouvement(s) financier(s)`);
    if (ngpCodeCount > 0) blockers.push(`${ngpCodeCount} code(s) NGP`);
    if (bankAccountCount > 0) blockers.push(`${bankAccountCount} compte(s) bancaire(s)`);
    if (designCount > 0) blockers.push(`${designCount} design(s)`);
    if (cartonTypeCount > 0) blockers.push(`${cartonTypeCount} type(s) de carton`);
    if (userCompanyCount > 0) blockers.push(`${userCompanyCount} utilisateur(s) assigné(s)`);
    if (userCount > 0) blockers.push(`${userCount} utilisateur(s)`);

    if (blockers.length > 0) {
        return NextResponse.json(
            { error: `Impossible de supprimer cette entreprise : ${blockers.join(", ")}` },
            { status: 400 }
        );
    }

    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
