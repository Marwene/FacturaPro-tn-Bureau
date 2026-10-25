import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import Big from "big.js";
import { InvoiceStatus } from "@/prisma/generated/prisma/client";
import { apiRoute } from "@/lib/api-route";
import { paymentUpdateSchema } from "@/lib/schemas/document-updates";

// PATCH validé par `paymentUpdateSchema` via le wrapper : le corps parsé
// (`body`) remplace la lecture JSON inline — les clés inconnues sont strippées
// et `status` est borné à l'enum PaymentStatus (avant la migration, la valeur
// brute partait directement vers Prisma sans contrôle).
export const PATCH = apiRoute.patch(
  { permission: "paiements:creer", requireCompany: true, schema: paymentUpdateSchema },
  async (_request, { params, companyId, body }) => {
    const { id } = params;

    const existing = await prisma.payment.findFirst({
      where: { id, companyId },
      include: { invoice: true, achat: true },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Paiement introuvable"), { status: 404 });
    }

    const isConfirming = body.status === "CONFIRME" && existing.status === "EN_ATTENTE" && (existing.invoiceId || existing.achatId);
    const isCancelling = body.status === "ANNULE" && existing.status === "CONFIRME" && (existing.invoiceId || existing.achatId);

    // Cancellation flow: CONFIRME → ANNULE with balance reversal
    if (isCancelling) {
      const payment = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id },
          data: { status: "ANNULE" },
          include: {
            tiers: { select: { raisonSociale: true, ville: true } },
            invoice: { select: { numero: true, totalTTC: true, devise: true } },
          },
        });

        // Reverse invoice balance if linked to an invoice
        if (existing.invoice) {
          const invoice = existing.invoice;
          const montantPaye = new Big(invoice.montantPaye.toString());
          const totalTTC = new Big(invoice.totalTTC.toString());
          const montantPayment = new Big(existing.montant.toString());
          const newMontantPaye = montantPaye.minus(montantPayment);
          const newReste = totalTTC.minus(newMontantPaye);

          let newStatus: InvoiceStatus;
          if (newMontantPaye.lte(0)) {
            // No payment left → back to ENVOYEE (was paid/partially paid, now cancelled)
            newStatus = invoice.status === "PAYEE" || invoice.status === "PARTIELLE" ? "ENVOYEE" : invoice.status as InvoiceStatus;
          } else if (newReste.gt(0)) {
            newStatus = "PARTIELLE";
          } else {
            newStatus = "PAYEE";
          }

          await tx.invoice.update({
            where: { id: existing.invoiceId! },
            data: {
              montantPaye: newMontantPaye.gt(0) ? newMontantPaye.toFixed(4) : "0.0000",
              resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : totalTTC.toFixed(4),
              status: newStatus,
            },
          });
        }

        // Reverse achat balance if linked to an achat
        if (existing.achat) {
          const achat = existing.achat;
          const montantPaye = new Big(achat.montantPaye.toString());
          const totalTTC = new Big(achat.totalTTC.toString());
          const montantPayment = new Big(existing.montant.toString());
          const newMontantPaye = montantPaye.minus(montantPayment);
          const newReste = totalTTC.minus(newMontantPaye);

          await tx.achat.update({
            where: { id: existing.achatId! },
            data: {
              montantPaye: newMontantPaye.gt(0) ? newMontantPaye.toFixed(4) : "0.0000",
              resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : totalTTC.toFixed(4),
            },
          });
        }

        return updatedPayment;
      });

      return { payment: serializeDecimals(payment) };
    }

    // Confirmation flow: EN_ATTENTE → CONFIRME — update payment + apply balance in a single transaction
    if (isConfirming) {
      const payment = await prisma.$transaction(async (tx) => {
        const updatedPayment = await tx.payment.update({
          where: { id },
          data: {
            ...(body.reference !== undefined ? { reference: body.reference ?? null } : {}),
            ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
            ...(body.dateReglement ? { dateReglement: new Date(body.dateReglement) } : {}),
            status: "CONFIRME",
          },
          include: {
            tiers: { select: { raisonSociale: true, ville: true } },
            invoice: { select: { numero: true, totalTTC: true, devise: true } },
          },
        });

        // Apply to invoice balance
        if (existing.invoice) {
          const invoice = existing.invoice;
          const montantPaye = new Big(invoice.montantPaye.toString());
          const totalTTC = new Big(invoice.totalTTC.toString());
          const newMontantPaye = montantPaye.plus(new Big(existing.montant.toString()));
          const newReste = totalTTC.minus(newMontantPaye);

          let newStatus: InvoiceStatus;
          if (newReste.lte(0)) {
            newStatus = "PAYEE";
          } else if (newMontantPaye.gt(0)) {
            newStatus = "PARTIELLE";
          } else {
            newStatus = invoice.status as InvoiceStatus;
          }

          await tx.invoice.update({
            where: { id: existing.invoiceId! },
            data: {
              montantPaye: newMontantPaye.toFixed(4),
              resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : "0.0000",
              status: newStatus,
            },
          });
        }

        // Apply to achat balance
        if (existing.achat) {
          const achat = existing.achat;
          const montantPaye = new Big(achat.montantPaye.toString());
          const totalTTC = new Big(achat.totalTTC.toString());
          const newMontantPaye = montantPaye.plus(new Big(existing.montant.toString()));
          const newReste = totalTTC.minus(newMontantPaye);

          await tx.achat.update({
            where: { id: existing.achatId! },
            data: {
              montantPaye: newMontantPaye.toFixed(4),
              resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : "0.0000",
            },
          });
        }

        return updatedPayment;
      });

      return { payment: serializeDecimals(payment) };
    }

    // Default field update (non-status or non-transition)
    const payment = await prisma.payment.update({
      where: { id },
      data: {
        ...(body.reference !== undefined ? { reference: body.reference ?? null } : {}),
        ...(body.notes !== undefined ? { notes: body.notes ?? null } : {}),
        ...(body.dateReglement ? { dateReglement: new Date(body.dateReglement) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
      include: {
        tiers: { select: { raisonSociale: true, ville: true } },
        invoice: { select: { numero: true, totalTTC: true, devise: true } },
      },
    });

    return { payment: serializeDecimals(payment) };
  }
);

export const DELETE = apiRoute.delete(
  { permission: "paiements:creer", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const payment = await prisma.payment.findFirst({
      where: { id, companyId },
      include: { invoice: true, achat: true },
    });
    if (!payment) {
      return NextResponse.json(errorResponse("Paiement introuvable"), { status: 404 });
    }

    // EN_ATTENTE or ANNULE: no balance was applied (or already reversed) — just delete
    if (payment.status === "EN_ATTENTE" || payment.status === "ANNULE") {
      await prisma.payment.delete({ where: { id } });
      return { success: true };
    }

    // CONFIRME: reverse balances before deleting
    const invoice = payment.invoice;
    const achat = payment.achat;

    if (!invoice && !achat) {
      await prisma.payment.delete({ where: { id } });
      return { success: true };
    }

    if (achat) {
      const montantPaye = new Big(achat.montantPaye.toString());
      const montantRetire = new Big(payment.montant.toString());
      const newMontantPaye = montantPaye.minus(montantRetire);
      const totalTTC = new Big(achat.totalTTC.toString());
      const newReste = totalTTC.minus(newMontantPaye);

      await prisma.$transaction([
        prisma.payment.delete({ where: { id } }),
        prisma.achat.update({
          where: { id: achat.id },
          data: {
            montantPaye: newMontantPaye.gt(0) ? newMontantPaye.toFixed(4) : "0.0000",
            resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : "0.0000",
          },
        }),
      ]);

      return { success: true };
    }

    if (!invoice) {
      await prisma.payment.delete({ where: { id } });
      return { success: true };
    }

    const montantPaye = new Big(invoice.montantPaye.toString());
    const montantRetire = new Big(payment.montant.toString());
    const newMontantPaye = montantPaye.minus(montantRetire);
    const totalTTC = new Big(invoice.totalTTC.toString());
    const newReste = totalTTC.minus(newMontantPaye);

    let newStatus: InvoiceStatus;
    if (newMontantPaye.lte(0)) {
      newStatus = invoice.status === "PAYEE" || invoice.status === "PARTIELLE" ? "ENVOYEE" : invoice.status as InvoiceStatus;
    } else if (newReste.gt(0)) {
      newStatus = "PARTIELLE";
    } else {
      newStatus = "PAYEE";
    }

    await prisma.$transaction([
      prisma.payment.delete({ where: { id } }),
      prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          montantPaye: newMontantPaye.gt(0) ? newMontantPaye.toFixed(4) : "0.0000",
          resteAPayer: newReste.gt(0) ? newReste.toFixed(4) : "0.0000",
          status: newStatus,
        },
      }),
    ]);

    return { success: true };
  }
);
