import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { apiRoute } from "@/lib/api-route";
import { readRequestBody, withServiceErrors } from "@/lib/service-route";
import { createBonLivraison } from "@/lib/bon-livraison/create";
import { BonLivraisonStatus } from "@/prisma/generated/prisma/client";

export const GET = apiRoute.get(
  { permission: "bonsLivraison:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") as BonLivraisonStatus | null;
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const take = parseInt(searchParams.get("take") ?? "50", 10);
    const clientId = searchParams.get("clientId");
    const blViseActif = searchParams.get("blViseActif");

    const where = {
      AND: [
        { companyId },
        clientId ? { tiersId: clientId } : {},
        blViseActif === "true" ? { blViseActif: true } : {},
        status ? { status } : {},
        search
          ? {
            OR: [
              { numero: { contains: search, mode: "insensitive" as const } },
              {
                tiers: {
                  raisonSociale: { contains: search, mode: "insensitive" as const },
                },
              },
            ],
          }
          : {},
      ],
    };

    const [deliveryNotes, total, agg, livreCount, brouillonCount] = await Promise.all([
      prisma.bonLivraison.findMany({
        where,
        include: {
          tiers: {
            select: { raisonSociale: true, ville: true },
          },
          lines: true,
          invoices: {
            include: {
              invoice: {
                select: {
                  id: true,
                  numero: true,
                  dateEmission: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.bonLivraison.count({ where }),
      prisma.bonLivraison.aggregate({
        where,
        _sum: { totalTTC: true },
      }),
      prisma.bonLivraison.count({ where: { ...where, status: "LIVRE" } }),
      prisma.bonLivraison.count({ where: { ...where, status: "BROUILLON" } }),
    ]);

    const serialized = serializeDecimals(deliveryNotes);

    if (blViseActif === "true") {
      const snNumbers = [
        ...new Set(
          deliveryNotes
            .filter((d) => d.blViseActif && d.snNumero)
            .map((d) => d.snNumero as string)
        ),
      ];
      if (snNumbers.length > 0) {
        const linkedInvoices = await prisma.invoice.findMany({
          where: {
            companyId,
            bcViseActif: true,
            bcViseNumero: { in: snNumbers },
          },
          select: {
            id: true,
            numero: true,
            dateEmission: true,
            bcViseNumero: true,
            tiersId: true,
          },
          orderBy: { createdAt: "desc" },
        });
        const invoiceBySn = new Map(
          linkedInvoices.map((inv) => [
            `${inv.tiersId}:${inv.bcViseNumero}`,
            {
              id: inv.id,
              numero: inv.numero,
              dateEmission: inv.dateEmission.toISOString(),
            },
          ])
        );
        for (const bl of serialized as Array<Record<string, unknown>>) {
          if (bl.blViseActif && bl.snNumero) {
            const inv = invoiceBySn.get(`${bl.tiersId}:${bl.snNumero}`);
            if (inv) bl.invoice = inv;
          }
        }
      }
    }

    return {
      deliveryNotes: serialized,
      total,
      stats: {
        total,
        totalTTC: agg._sum.totalTTC?.toString() ?? "0",
        livres: livreCount,
        brouillons: brouillonCount,
      },
    };
  }
);

// Création déportée vers `lib/bon-livraison/create.ts` (lot H) : service partagé
// avec `validateBonCommande` (app/actions/bons-commande.ts) — plus de tour HTTP.
export const POST = apiRoute.post(
  { permission: "bonsLivraison:creer", requireCompany: true },
  async (request, { companyId }) =>
    withServiceErrors(async () =>
      NextResponse.json(await createBonLivraison(await readRequestBody(request), companyId), { status: 201 })
    )
);
