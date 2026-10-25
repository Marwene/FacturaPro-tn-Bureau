import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { apiRoute } from "@/lib/api-route";
import { quoteConvertSchema, type QuoteConvertInput } from "@/lib/schemas/document-updates";
import { nextNumber } from "@/lib/sequence";
import Big from "big.js";

// La cible est validée par le Zod du wrapper (422) : le type est dérivé du
// schéma plutôt que d'un const d'exécution devenu inutile.
type ConvertTarget = NonNullable<QuoteConvertInput>["target"];

export const POST = apiRoute.post(
  { permission: "devis:modifier", requireCompany: true, schema: quoteConvertSchema },
  async (_request, { params, companyId, body }) => {
    const { id } = params;

    const existing = await prisma.quote.findFirst({
      where: { id, companyId },
      include: {
        lines: true,
        tiers: true,
      },
    });

    if (!existing) {
      return NextResponse.json(errorResponse("Devis introuvable"), { status: 404 });
    }

    if (existing.status === "REFUSEE" || existing.status === "EXPIREE") {
      return NextResponse.json(
        errorResponse("Ce devis ne peut plus être converti"),
        { status: 400 }
      );
    }

    // Corps optionnel (backward compat : l'appelant frontend POSTe sans corps) —
    // le Zod racine `.optional()` accepte `undefined`, la cible reste « invoice ».
    // Une cible hors enum est rejetée en 422 par le wrapper avant le handler.
    const target: ConvertTarget = body?.target ?? "invoice";

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json(errorResponse("Société introuvable"), { status: 400 });
    }

    // ─── Financial calculations ──────────────────────────────────────────
    let totalHT = new Big(0);
    let totalTVA = new Big(0);
    let totalFodec = new Big(0);

    const tiers = await prisma.tiers.findUnique({
      where: { id: existing.tiersId },
    });

    for (const line of existing.lines) {
      const qty = new Big(line.quantite.toString());
      const prix = new Big(line.prixHT.toString());
      const remFactor = new Big(1).minus(new Big(line.remise.toString()).div(100));
      const lineHT = qty.times(prix).times(remFactor);
      const lineFodec = line.fodec
        ? lineHT.times(new Big(line.tauxFodec.toString()).div(100))
        : new Big(0);
      const lineTVA = lineHT.times(new Big(line.tauxTVA.toString()).div(100));

      totalHT = totalHT.plus(lineHT);
      totalTVA = totalTVA.plus(lineTVA);
      totalFodec = totalFodec.plus(lineFodec);
    }

    const totalTTC = totalHT.plus(totalTVA).plus(totalFodec);

    // ─── Target: Invoice ─────────────────────────────────────────────────
    if (target === "invoice") {
      if (existing.invoiceId) {
        return NextResponse.json(
          errorResponse("Ce devis a déjà été converti en facture"),
          { status: 400 }
        );
      }

      let totalRetenue = new Big(0);
      if (tiers && parseFloat(tiers.tauxRetenue.toString()) > 0) {
        const tauxRet = new Big(tiers.tauxRetenue.toString());
        totalRetenue = totalHT.times(tauxRet.div(100));
      }

      const resteAPayer = totalTTC.minus(totalRetenue);
      const prefix = company.prefixeFacture ?? "FAC";
      const numero = await nextNumber("invoice", prefix, companyId);

      const invoice = await prisma.invoice.create({
        data: {
          numero,
          tiersId: existing.tiersId,
          companyId,
          dateEmission: new Date(),
          dateEcheance: existing.dateExpiration ?? new Date(),
          baseHT: totalHT.toFixed(4),
          totalHT: totalHT.toFixed(4),
          totalTVA: totalTVA.toFixed(4),
          totalFodec: totalFodec.toFixed(4),
          totalRetenue: totalRetenue.toFixed(4),
          totalTTC: totalTTC.toFixed(4),
          montantPaye: "0.000",
          resteAPayer: resteAPayer.toFixed(4),
          status: "BROUILLON",
          notes: existing.notes,
          devise: existing.devise ?? "TND",
          tauxChange: existing.tauxChange ?? null,
          montantTND: existing.montantTND ?? null,
          lines: {
            create: existing.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId ?? null,
              description: line.description,
              quantite: line.quantite.toString(),
              prixHT: line.prixHT.toString(),
              remise: line.remise.toString(),
              tauxTVA: line.tauxTVA.toString(),
              fodec: line.fodec,
              tauxFodec: line.tauxFodec.toString(),
              totalHT: line.totalHT.toString(),
              ordre: line.ordre,
            })),
          },
        },
      });

      await prisma.quote.update({
        where: { id },
        data: {
          status: "FACTUREE",
          invoiceId: invoice.id,
        },
      });

      return NextResponse.json(
        { invoice: serializeDecimals(invoice) },
        { status: 201 }
      );
    }

    // ─── Target: Delivery Note (Bon de Livraison) ────────────────────────
    if (target === "deliveryNote") {
      if (existing.bonLivraisonId) {
        return NextResponse.json(
          errorResponse("Ce devis a déjà été converti en bon de livraison"),
          { status: 400 }
        );
      }

      const prefix = company.prefixeBL ?? "BL";
      const numero = await nextNumber("bl", prefix, companyId);

      const deliveryNote = await prisma.bonLivraison.create({
        data: {
          numero,
          tiersId: existing.tiersId,
          companyId,
          dateCreation: new Date(),
          baseHT: totalHT.toFixed(4),
          totalHT: totalHT.toFixed(4),
          totalTVA: totalTVA.toFixed(4),
          totalFodec: totalFodec.toFixed(4),
          totalTTC: totalTTC.toFixed(4),
          status: "BROUILLON",
          notes: existing.notes,
          devise: existing.devise ?? "TND",
          tauxChange: existing.tauxChange ?? null,
          montantTND: existing.montantTND ?? null,
          quoteId: existing.id,
          lines: {
            create: existing.lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId ?? null,
              description: line.description,
              quantite: line.quantite.toString(),
              prixHT: line.prixHT.toString(),
              remise: line.remise.toString(),
              tauxTVA: line.tauxTVA.toString(),
              fodec: line.fodec,
              tauxFodec: line.tauxFodec.toString(),
              totalHT: line.totalHT.toString(),
              ordre: line.ordre,
            })),
          },
        },
      });

      await prisma.quote.update({
        where: { id },
        data: {
          bonLivraisonId: deliveryNote.id,
        },
      });

      return NextResponse.json(
        { deliveryNote: serializeDecimals(deliveryNote) },
        { status: 201 }
      );
    }

    return NextResponse.json(errorResponse("Action non reconnue"), { status: 400 });
  }
);
