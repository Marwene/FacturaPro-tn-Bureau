import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { apiRoute } from "@/lib/api-route";
import { quoteStatusUpdateSchema } from "@/lib/schemas/document-updates";
import { expireDueQuotes } from "@/lib/quote-expiry";

export const GET = apiRoute.get(
  { permission: "devis:voir", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    // Write-on-read : expire les devis échus AVANT la lecture du détail
    await expireDueQuotes(prisma, companyId);

    const quote = await prisma.quote.findFirst({
      where: { id, companyId },
      include: {
        tiers: true,
        lines: {
          include: { product: true },
          orderBy: { ordre: "asc" },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(errorResponse("Devis introuvable"), { status: 404 });
    }

    return { quote: serializeDecimals(quote) };
  }
);

export const PATCH = apiRoute.patch(
  { permission: "devis:modifier", requireCompany: true, schema: quoteStatusUpdateSchema },
  async (_request, { params, companyId, body }) => {
    const { id } = params;

    const existing = await prisma.quote.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Devis introuvable"), { status: 404 });
    }

    const { status } = body;

    if (status) {
      // Le jeu de valeurs est validé par le Zod du wrapper (422).
      const quote = await prisma.quote.update({
        where: { id },
        data: { status },
        include: {
          tiers: { select: { raisonSociale: true, ville: true } },
        },
      });

      return { quote: serializeDecimals(quote) };
    }

    return NextResponse.json(errorResponse("Action non reconnue"), { status: 400 });
  }
);

export const DELETE = apiRoute.delete(
  { permission: "devis:supprimer", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const existing = await prisma.quote.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Devis introuvable"), { status: 404 });
    }

    await prisma.quote.delete({ where: { id } });
    return { success: true };
  }
);
