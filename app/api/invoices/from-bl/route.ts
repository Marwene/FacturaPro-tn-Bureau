import { NextResponse } from "next/server";
import type { Prisma } from "@/prisma/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";
import { serializeDecimals } from "@/lib/decimal";
import { nextNumber } from "@/lib/sequence";
import { assertClientNonBloque } from "@/lib/check-client-blocage";
import Big from "big.js";
import { z } from "zod";

const createFromBlSchema = z.object({
  clientId: z.string().min(1, "Client requis"),
  blIds: z.array(z.string()).min(1, "Au moins un BL requis"),
  dateEmission: z.string().optional(),
  dateEcheance: z.string().optional().nullable(),
  mode: z.enum(["consolidee", "par_bl"]).default("consolidee"),
});

type BlWithLines = Prisma.BonLivraisonGetPayload<{
  include: {
    lines: {
      include: {
        product: { select: { id: true; code: true } };
      };
    };
  };
}>;

type InvoiceLineInput = {
  productId: string | null;
  variantId: string | null;
  description: string;
  quantite: string;
  prixHT: string;
  remise: string;
  tauxTVA: string;
  fodec: boolean;
  tauxFodec: string;
  totalHT: string;
  ordre: number;
  bonLivraisonId: string;
};

type InvoiceTotals = {
  invoiceLines: InvoiceLineInput[];
  baseHT: Big;
  totalTVA: Big;
  totalFodec: Big;
  totalTTC: Big;
};

/**
 * Calcule les lignes de facture et les totaux (Big.js) à partir des BLs fournis.
 * Utilisé pour le mode consolidé (tous les BLs en une facture) et pour le mode
 * par_bl (les lignes d'un seul BL pour une facture).
 * La remise est toujours "0" (aucune remise sur la facturation depuis un BL).
 */
function buildInvoiceTotals(bls: BlWithLines[]): InvoiceTotals {
  let baseHT = new Big(0);
  let totalTVA = new Big(0);
  let totalFodec = new Big(0);

  const invoiceLines: InvoiceLineInput[] = [];
  let ordre = 1;

  for (const bl of bls) {
    for (const line of bl.lines) {
      const qty = new Big(String(line.quantite));
      const price = new Big(String(line.prixHT));
      const tva = new Big(String(line.tauxTVA));
      const lineHT = qty.times(price);
      const tvaAmount = lineHT.times(tva).div(100);

      invoiceLines.push({
        productId: line.productId ?? null,
        variantId: line.variantId ?? null,
        description: line.description,
        quantite: qty.toFixed(3),
        prixHT: price.toFixed(4),
        remise: "0",
        tauxTVA: tva.toFixed(2),
        fodec: line.fodec,
        tauxFodec: new Big(String(line.tauxFodec)).toFixed(2),
        totalHT: lineHT.toFixed(4),
        ordre: ordre++,
        bonLivraisonId: bl.id,
      });

      baseHT = baseHT.plus(lineHT);
      totalTVA = totalTVA.plus(tvaAmount);
      if (line.fodec) {
        totalFodec = totalFodec.plus(lineHT.times(new Big(String(line.tauxFodec))).div(100));
      }
    }
  }

  const totalTTC = baseHT.plus(totalTVA).plus(totalFodec);

  return { invoiceLines, baseHT, totalTVA, totalFodec, totalTTC };
}

export const POST = apiRoute.post(
  { permission: "factures:creer", requireCompany: true },
  async (request, { companyId }) => {
    const body = await request.json();
    const parsed = createFromBlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Données invalides", parsed.error.issues),
        { status: 400 }
      );
    }

    const { clientId, blIds, dateEmission, dateEcheance, mode } = parsed.data;

    await assertClientNonBloque(clientId);

    // Vérifier que tous les BLs existent, sont LIVRE, appartiennent au client/société
    // et ne sont liés à AUCUNE facture (garde-fou anti double facturation —
    // le statut des BLs reste LIVRE, seul le lien invoices indique la facturation).
    const bls = await prisma.bonLivraison.findMany({
      where: {
        id: { in: blIds },
        status: "LIVRE",
        tiersId: clientId,
        companyId,
        invoices: { none: {} },
      },
      include: {
        lines: {
          include: {
            product: { select: { id: true, code: true } },
          },
        },
      },
    });

    if (bls.length !== blIds.length) {
      return NextResponse.json(
        errorResponse("Certains BLs n'ont pas été trouvés ou ne sont pas en status LIVRE"),
        { status: 400 }
      );
    }

    // Générer le numéro de facture
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json(errorResponse("Société introuvable"), { status: 400 });
    }
    const prefix = company.prefixeFacture ?? "FAC";

    const emissionDate = dateEmission ? new Date(dateEmission) : new Date();
    const echeanceDate = dateEcheance ? new Date(dateEcheance) : null;

    // ── Mode par_bl : un BL = une facture, tout dans une seule transaction ──
    if (mode === "par_bl") {
      // Numéros générés en amont (hors transaction) : un trou de numérotation
      // après rollback est acceptable.
      const numbered: Array<{ bl: BlWithLines; numero: string }> = [];
      for (const bl of bls) {
        numbered.push({ bl, numero: await nextNumber("invoice", prefix, companyId) });
      }

      const created = await prisma.$transaction(async (tx) => {
        const results: Array<{ id: string; numero: string }> = [];

        for (const { bl, numero } of numbered) {
          const { invoiceLines, baseHT, totalTVA, totalFodec, totalTTC } =
            buildInvoiceTotals([bl]);

          const invoice = await tx.invoice.create({
            data: {
              numero,
              tiersId: clientId,
              companyId,
              dateEmission: emissionDate,
              dateEcheance: echeanceDate,
              baseHT: baseHT.toFixed(4),
              totalHT: baseHT.toFixed(4),
              totalTVA: totalTVA.toFixed(4),
              totalFodec: totalFodec.toFixed(4),
              totalRetenue: "0",
              totalTTC: totalTTC.toFixed(4),
              montantPaye: "0",
              resteAPayer: totalTTC.toFixed(4),
              status: "BROUILLON",
              lines: {
                create: invoiceLines,
              },
              bonsLivraison: {
                create: [{ bonLivraisonId: bl.id }],
              },
            },
            select: { id: true, numero: true },
          });

          results.push(invoice);
        }

        return results;
      });

      return { invoices: serializeDecimals(created) };
    }

    // ── Mode consolidé (défaut) : tous les BLs en UNE facture ──
    const invoiceNumero = await nextNumber("invoice", prefix, companyId);
    const { invoiceLines, baseHT, totalTVA, totalFodec, totalTTC } =
      buildInvoiceTotals(bls);

    const invoice = await prisma.invoice.create({
      data: {
        numero: invoiceNumero,
        tiersId: clientId,
        companyId,
        dateEmission: emissionDate,
        dateEcheance: echeanceDate,
        baseHT: baseHT.toFixed(4),
        totalHT: baseHT.toFixed(4),
        totalTVA: totalTVA.toFixed(4),
        totalFodec: totalFodec.toFixed(4),
        totalRetenue: "0",
        totalTTC: totalTTC.toFixed(4),
        montantPaye: "0",
        resteAPayer: totalTTC.toFixed(4),
        status: "BROUILLON",
        lines: {
          create: invoiceLines,
        },
        bonsLivraison: {
          create: blIds.map((blId) => ({ bonLivraisonId: blId })),
        },
      },
      select: { id: true, numero: true },
    });

    // Note: Le statut des BLs reste LIVRE — la relation invoices indique qu'ils sont facturés
    // Pas de mise à jour de status nécessaire ici

    return { invoices: serializeDecimals([invoice]) };
  }
);
