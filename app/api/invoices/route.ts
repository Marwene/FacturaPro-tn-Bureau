import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { apiRoute } from "@/lib/api-route";
import { readRequestBody, withServiceErrors } from "@/lib/service-route";
import { createInvoice } from "@/lib/invoice/create";
import { InvoiceStatus } from "@/prisma/generated/prisma/client";

export const GET = apiRoute.get(
  { permission: "factures:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") as InvoiceStatus | null;

    const where = {
      AND: [
        { companyId },
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

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        tiers: {
          select: {
            id: true,
            raisonSociale: true,
            ville: true,
            matriculeFiscal: true,
            tauxRetenue: true,
          },
        },
        payments: {
          select: {
            id: true,
            montant: true,
            methode: true,
            status: true,
            reference: true,
            dateReglement: true,
            effet: {
              select: {
                id: true,
                numero: true,
                status: true,
                dateEcheance: true,
              },
            },
            cheque: {
              select: {
                id: true,
                numero: true,
                status: true,
                dateEcheance: true,
              },
            },
          },
          orderBy: { dateReglement: "desc" },
        },
        effets: {
          select: {
            id: true,
            numero: true,
            montant: true,
            status: true,
            dateEcheance: true,
            type: true,
          },
          where: {
            type: "RECU",
          },
        },
        cheques: {
          select: {
            id: true,
            numero: true,
            montant: true,
            status: true,
            dateEcheance: true,
            type: true,
          },
          where: {
            type: "RECU",
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const [stats, paidCount, pendingSum, overdueSum] = await Promise.all([
      prisma.invoice.aggregate({
        where,
        _sum: { totalTTC: true, montantPaye: true, resteAPayer: true },
      }),
      prisma.invoice.count({ where: { ...where, status: "PAYEE" } }),
      prisma.invoice.aggregate({
        where: { ...where, status: { in: ["ENVOYEE", "PARTIELLE"] } },
        _sum: { resteAPayer: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: { ...where, status: "EN_RETARD" },
        _sum: { resteAPayer: true },
        _count: true,
      }),
    ]);

    return {
      invoices: serializeDecimals(invoices),
      stats: {
        totalFacture: stats._sum.totalTTC?.toString() ?? "0",
        totalFactures: invoices.length,
        encaisse: stats._sum.montantPaye?.toString() ?? "0",
        paidCount,
        enAttente: pendingSum._sum.resteAPayer?.toString() ?? "0",
        pendingCount: pendingSum._count,
        enRetard: overdueSum._sum.resteAPayer?.toString() ?? "0",
        overdueCount: overdueSum._count,
      },
    };
  }
);

// Création déportée vers `lib/invoice/create.ts` (lot H) : service partagé
// avec `validateBonCommande` (app/actions/bons-commande.ts), sans tour HTTP.
export const POST = apiRoute.post(
  { permission: "factures:creer", requireCompany: true },
  async (request, { companyId }) =>
    withServiceErrors(async () =>
      NextResponse.json(await createInvoice(await readRequestBody(request), companyId), { status: 201 })
    )
);
