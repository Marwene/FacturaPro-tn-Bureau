import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { apiRoute } from "@/lib/api-route";

// ─── Export PATCH validation ──────────────────────────────────────────────────

const exportPatchLineSchema = z.object({
  bonLivraisonId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  ngpCodeId: z.string().optional().nullable(),
  ngpCode: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  quantite: z.coerce.number().min(0).optional(),
  quantiteBL: z.coerce.number().min(0).optional().nullable(),
  resteQuantite: z.coerce.number().min(0).optional().nullable(),
  bonLivraisonNumero: z.string().optional().nullable(),
  snNumero: z.string().optional().nullable(),
  dateBL: z.string().optional().nullable(),
  invoiceNumero: z.string().optional().nullable(),
  dateFact: z.string().optional().nullable(),
});

const exportPatchSchema = z.object({
  status: z.string().optional(),
  decVente: z.string().optional().nullable(),
  dateDecVente: z.string().optional().nullable(),
  simultanee: z.string().optional().nullable(),
  dateSimultanee: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(exportPatchLineSchema).optional(),
});

export const GET = apiRoute.get(
  { permission: "bonsLivraison:voir", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const existing = await prisma.export.findFirst({
      where: { id, companyId },
      include: {
        tiers: true,
        lines: true,
      },
    });

    if (!existing) {
      return NextResponse.json(errorResponse("Export introuvable"), { status: 404 });
    }

    return { export: serializeDecimals(existing) };
  }
);

export const PATCH = apiRoute.patch(
  { permission: "bonsLivraison:modifier", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const existing = await prisma.export.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Export introuvable"), { status: 404 });
    }

    const body = await request.json();
    const parsed = exportPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Données invalides", parsed.error.issues),
        { status: 400 }
      );
    }
    const data = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.decVente !== undefined) updateData.decVente = data.decVente;
    if (data.dateDecVente !== undefined) updateData.dateDecVente = data.dateDecVente ? new Date(data.dateDecVente) : null;
    if (data.simultanee !== undefined) updateData.simultanee = data.simultanee;
    if (data.dateSimultanee !== undefined) updateData.dateSimultanee = data.dateSimultanee ? new Date(data.dateSimultanee) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.lines) {
      await prisma.$transaction(async (tx) => {
        await tx.exportLine.deleteMany({ where: { exportId: id } });
        await tx.exportLine.createMany({
          data: data.lines!.map((line) => ({
            exportId: id,
            bonLivraisonId: line.bonLivraisonId ?? null,
            invoiceId: line.invoiceId ?? null,
            ngpCodeId: line.ngpCodeId ?? null,
            ngpCode: line.ngpCode ?? null,
            barcode: line.barcode ?? null,
            quantite: line.quantite?.toFixed(3) ?? "0",
            quantiteBL: line.quantiteBL?.toFixed(3) ?? null,
            resteQuantite: line.resteQuantite?.toFixed(3) ?? null,
            bonLivraisonNumero: line.bonLivraisonNumero ?? null,
            snNumero: line.snNumero ?? null,
            dateBL: line.dateBL ? new Date(line.dateBL) : null,
            invoiceNumero: line.invoiceNumero ?? null,
            dateFact: line.dateFact ? new Date(line.dateFact) : null,
          })),
        });
      });
    }

    const updated = await prisma.export.update({
      where: { id },
      data: updateData,
      include: {
        tiers: { select: { raisonSociale: true, ville: true } },
        lines: true,
      },
    });

    return { export: serializeDecimals(updated) };
  }
);

export const DELETE = apiRoute.delete(
  { permission: "bonsLivraison:supprimer", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;

    const existing = await prisma.export.findFirst({
      where: { id, companyId },
    });
    if (!existing) {
      return NextResponse.json(errorResponse("Export introuvable"), { status: 404 });
    }

    await prisma.export.delete({ where: { id } });
    return { success: true };
  }
);
