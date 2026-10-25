import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { handleSaleStockMovement } from "@/lib/stock-utils";
import { apiRoute } from "@/lib/api-route";
import { invoiceStatusUpdateSchema } from "@/lib/schemas/document-updates";
import { VALID_INVOICE_TRANSITIONS, isValidInvoiceTransition } from "@/lib/status-transitions";

export const GET = apiRoute.get(
  { permission: "factures:voir", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        tiers: true,
        lines: {
          include: { product: true },
          orderBy: { ordre: "asc" },
        },
        payments: {
          include: { tiers: { select: { raisonSociale: true } } },
          orderBy: { createdAt: "desc" },
        },
        bonsLivraison: {
          include: {
            bonLivraison: {
              select: { numero: true, dateLivraison: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(errorResponse("Facture introuvable"), {
        status: 404,
      });
    }

    return { invoice: serializeDecimals(invoice) };
  }
);

export const PATCH = apiRoute.patch(
  { permission: "factures:modifier", requireCompany: true, schema: invoiceStatusUpdateSchema },
  async (_request, { params, companyId, body }) => {
    const { id } = params;
    const { status } = body;

    const existing = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: { lines: { select: { productId: true, variantId: true, quantite: true } } },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Facture introuvable"), { status: 404 });
    }

    // Le jeu de valeurs est validé par le Zod du wrapper (422) : seule la
    // TRANSITION dépend de l'état courant → elle reste un contrôle du handler.
    if (status && !isValidInvoiceTransition(existing.status, status)) {
      return NextResponse.json(
        errorResponse(
          `Transition invalide: ${existing.status} → ${status}. ` +
            `Transitions autorisées: ${(VALID_INVOICE_TRANSITIONS[existing.status] ?? []).join(", ") || "aucune (état terminal)"}`
        ),
        { status: 400 }
      );
    }

    if (status && status !== existing.status) {
      await handleSaleStockMovement(
        "invoice",
        existing.status,
        status,
        existing.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantite: l.quantite.toNumber(),
        })),
        existing.numero,
      );
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        tiers: { select: { raisonSociale: true, ville: true } },
      },
    });

    return { invoice: serializeDecimals(invoice) };
  }
);

export const DELETE = apiRoute.delete(
  { permission: "factures:supprimer", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const existing = await prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        bonsLivraison: {
          select: { bonLivraison: { select: { numero: true } } },
        },
      },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Facture introuvable"), { status: 404 });
    }

    if (existing.bonsLivraison.length > 0) {
      return NextResponse.json(
        {
          error: "Facture liée à des bons de livraison",
          invoiceNumero: existing.numero,
          blNumeros: existing.bonsLivraison.map((link) => link.bonLivraison.numero),
        },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({ where: { id } });
    return { success: true };
  }
);
