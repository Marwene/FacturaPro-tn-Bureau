import { NextRequest, NextResponse } from "next/server";
import { paymentSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";
import { PaymentMethod } from "@/prisma/generated/prisma/client";
import { apiRoute } from "@/lib/api-route";
import { applyPaymentToInvoice, applyPaymentToAchat, PaymentResourceNotFoundError } from "@/lib/invoice-payment";

export const GET = apiRoute.get(
  { permission: "paiements:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");
    const achatId = searchParams.get("achatId");
    const search = searchParams.get("search");
    const method = searchParams.get("method");
    const status = searchParams.get("status");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {
      ...(invoiceId ? { invoiceId } : {}),
      ...(achatId ? { achatId } : {}),
      companyId,
      ...(method && method !== "ALL" ? { methode: method } : {}),
      ...(status && status !== "ALL" ? { status } : {}),
    };

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);
      where.dateReglement = dateFilter;
    }

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { tiers: { raisonSociale: { contains: search, mode: "insensitive" } } },
        { invoice: { numero: { contains: search, mode: "insensitive" } } },
        { achat: { numero: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [payments, aggregate] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          tiers: { select: { raisonSociale: true, ville: true } },
          invoice: { select: { numero: true, totalTTC: true, devise: true } },
          achat: { select: { numero: true, totalTTC: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.aggregate({
        where,
        _sum: { montant: true },
        _count: true,
      }),
    ]);

    const totalEncaisse = aggregate._sum.montant
      ? new Big(aggregate._sum.montant.toString())
      : new Big(0);

    const methodBreakdown = payments.reduce(
      (acc, p) => {
        const m = p.methode;
        if (!acc[m]) acc[m] = { count: 0, total: new Big(0) };
        acc[m].count++;
        acc[m].total = acc[m].total.plus(new Big(p.montant.toString()));
        return acc;
      },
      {} as Record<string, { count: number; total: Big }>
    );

    const serializedBreakdown: Record<string, { count: number; total: string }> = {};
    for (const [key, val] of Object.entries(methodBreakdown)) {
      serializedBreakdown[key] = { count: val.count, total: val.total.toFixed(3) };
    }

    return {
      payments: serializeDecimals(payments),
      stats: {
        total: aggregate._count,
        totalEncaisse: totalEncaisse.toFixed(3),
        methodBreakdown: serializedBreakdown,
      },
    };
  }
);

export const POST = apiRoute.post(
  { permission: "paiements:creer", requireCompany: true },
  async (request, { companyId }) => {
    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Données invalides", parsed.error.issues),
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.achatId) {
      const achat = await prisma.achat.findFirst({
        where: { id: data.achatId, companyId },
      });

      if (!achat) {
        return NextResponse.json(errorResponse("Achat introuvable"), {
          status: 404,
        });
      }

      if (data.tiersId !== achat.tiersId) {
        return NextResponse.json(
          errorResponse("Le tiers du paiement ne correspond pas au fournisseur de cet achat."),
          { status: 400 }
        );
      }

      try {
        const payment = await applyPaymentToAchat(data.achatId, data.montant.toString(), {
          methode: data.methode as PaymentMethod,
          dateReglement: new Date(data.dateReglement),
          reference: data.reference,
          notes: data.notes,
          tiersId: data.tiersId,
          companyId,
        });

        const full = await prisma.payment.findUnique({
          where: { id: payment.id },
          include: {
            tiers: { select: { raisonSociale: true } },
            achat: { select: { numero: true } },
          },
        });

        return NextResponse.json(
          { payment: serializeDecimals(full) },
          { status: 201 }
        );
      } catch (err) {
        if (err instanceof PaymentResourceNotFoundError) {
          return NextResponse.json(errorResponse(err.message), { status: 404 });
        }
        throw err;
      }
    }

    if (!data.invoiceId) {
      return NextResponse.json(errorResponse("Facture requise"), {
        status: 400,
      });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: data.invoiceId, companyId },
    });

    if (!invoice) {
      return NextResponse.json(errorResponse("Facture introuvable"), {
        status: 404,
      });
    }

    if (data.tiersId !== invoice.tiersId) {
      return NextResponse.json(
        errorResponse("Le tiers du paiement ne correspond pas au client de cette facture."),
        { status: 400 }
      );
    }

    try {
      const payment = await applyPaymentToInvoice({
        invoiceId: data.invoiceId,
        tiersId: data.tiersId,
        montant: data.montant.toString(),
        methode: data.methode as PaymentMethod,
        reference: data.reference,
        dateReglement: new Date(data.dateReglement),
        notes: data.notes,
        companyId,
        status: data.methode === "VIREMENT" ? "EN_ATTENTE" : "CONFIRME",
      });

      const full = await prisma.payment.findUnique({
        where: { id: payment.id },
        include: {
          tiers: { select: { raisonSociale: true } },
          invoice: { select: { numero: true } },
        },
      });

      return NextResponse.json(
        { payment: serializeDecimals(full) },
        { status: 201 }
      );
    } catch (err) {
      if (err instanceof PaymentResourceNotFoundError) {
        return NextResponse.json(errorResponse(err.message), { status: 404 });
      }
      throw err;
    }
  }
);
