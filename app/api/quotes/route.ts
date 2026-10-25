import { NextRequest, NextResponse } from "next/server";
import { quoteSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { assertClientNonBloque } from "@/lib/check-client-blocage";
import { serializeDecimals } from "@/lib/decimal";
import { apiRoute } from "@/lib/api-route";
import { nextNumber } from "@/lib/sequence";
import { expireDueQuotes } from "@/lib/quote-expiry";
import Big from "big.js";
import { QuoteStatus } from "@/prisma/generated/prisma/client";

export const GET = apiRoute.get(
  { permission: "devis:voir", requireCompany: true },
  async (request, { companyId }) => {
    // Write-on-read : expire les devis échus AVANT tout calcul (liste + stats)
    await expireDueQuotes(prisma, companyId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") as QuoteStatus | null;
    const skip = parseInt(searchParams.get("skip") ?? "0", 10);
    const take = parseInt(searchParams.get("take") ?? "50", 10);

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

    const [quotes, total, aggTND, aggMontantTND, acceptedCount, pendingCount] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          tiers: {
            select: { raisonSociale: true, ville: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.quote.count({ where }),
      prisma.quote.aggregate({
        where: { ...where, devise: "TND" },
        _sum: { totalTTC: true },
      }),
      prisma.quote.aggregate({
        where: { ...where, devise: { not: "TND" }, montantTND: { not: null } },
        _sum: { montantTND: true },
      }),
      prisma.quote.count({ where: { ...where, status: "ACCEPTEE" } }),
      prisma.quote.count({ where: { ...where, status: "ENVOYEE" } }),
    ]);

    const tauxAcceptation = total > 0 ? Math.round((acceptedCount / total) * 100) : 0;

    // Montant total en TND : somme des devis TND (totalTTC) + somme des devis étrangers (montantTND)
    const montantTotalTND = new Big(aggTND._sum.totalTTC?.toString() ?? "0")
      .plus(new Big(aggMontantTND._sum.montantTND?.toString() ?? "0"));

    return {
      quotes: serializeDecimals(quotes),
      total,
      stats: {
        total,
        montantTotal: montantTotalTND.toString(),
        tauxAcceptation,
        enAttente: pendingCount,
      },
    };
  }
);

export const POST = apiRoute.post(
  { permission: "devis:creer", requireCompany: true },
  async (request, { companyId }) => {
    const body = await request.json();
    const parsed = quoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Données invalides", parsed.error.issues),
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.tiersId) {
      await assertClientNonBloque(data.tiersId);
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return NextResponse.json({ error: "Société introuvable" }, { status: 400 });
    const prefix = company?.prefixeDevis ?? "DEV";
    const numero = await nextNumber("quote", prefix, companyId!);

    let totalHT = new Big(0);
    let totalTVA = new Big(0);
    let totalFodec = new Big(0);

    let clientExonereTVA = false;
    if (data.tiersId) {
      const tiers = await prisma.tiers.findUnique({
        where: { id: data.tiersId },
        select: { exonereTVA: true },
      });
      clientExonereTVA = tiers?.exonereTVA ?? false;
    }

    const lines = data.lines.map((line, i) => {
      const qty = new Big(line.quantite);
      const prix = new Big(line.prixHT);
      const remFactor = new Big(1).minus(new Big(line.remise).div(100));
      const lineHT = qty.times(prix).times(remFactor);
      const lineFodec = clientExonereTVA
        ? new Big(0)
        : line.fodec
          ? lineHT.times(new Big(line.tauxFodec).div(100))
          : new Big(0);
      const lineTVA = clientExonereTVA
        ? new Big(0)
        : lineHT.times(new Big(line.tauxTVA).div(100));

      totalHT = totalHT.plus(lineHT);
      totalTVA = totalTVA.plus(lineTVA);
      totalFodec = totalFodec.plus(lineFodec);

      return {
        productId: line.productId ?? null,
        variantId: line.variantId ?? null,
        description: line.description,
        quantite: qty.toFixed(3),
        prixHT: prix.toFixed(4),
        remise: new Big(line.remise).toFixed(2),
        tauxTVA: new Big(line.tauxTVA).toFixed(2),
        fodec: line.fodec,
        tauxFodec: new Big(line.tauxFodec).toFixed(2),
        totalHT: lineHT.toFixed(4),
        ordre: i + 1,
      };
    });

    const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);

    // Calculer montantTND : si devise étrangère et taux fourni, convertir
    const devise = data.devise ?? "TND";
    const tauxChange = data.tauxChange ? new Big(data.tauxChange) : null;
    let montantTND: Big | null = null;
    if (devise !== "TND" && tauxChange && tauxChange.gt(0)) {
      montantTND = totalTTC.times(tauxChange);
    }

    const quote = await prisma.quote.create({
      data: {
        numero,
        tiersId: data.tiersId,
        companyId,
        dateCreation: new Date(data.dateCreation),
        dateExpiration: data.dateExpiration
          ? new Date(data.dateExpiration)
          : (() => {
            const d = new Date(data.dateCreation);
            d.setDate(d.getDate() + 10);
            return d;
          })(),
        baseHT: totalHT.toFixed(4),
        totalHT: totalHT.toFixed(4),
        totalTVA: totalTVA.toFixed(4),
        totalFodec: totalFodec.toFixed(4),
        totalTTC: totalTTC.toFixed(4),
        status: "BROUILLON",
        notes: data.notes ?? null,
        devise,
        tauxChange: tauxChange?.toFixed(4) ?? null,
        montantTND: montantTND?.toFixed(4) ?? null,
        lines: { create: lines },
      },
      include: {
        tiers: { select: { raisonSociale: true, ville: true } },
      },
    });

    return NextResponse.json(
      { quote: serializeDecimals(quote) },
      { status: 201 }
    );
  }
);
