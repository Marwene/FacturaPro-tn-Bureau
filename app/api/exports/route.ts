import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { errorResponse } from "@/lib/schemas";
import { apiRoute } from "@/lib/api-route";
import { nextNumber } from "@/lib/sequence";
import { z } from "zod";

const exportLineSchema = z.object({
  ngpCode: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  snNumero: z.string().optional().nullable(),
  quantite: z.coerce.number().min(0, "Quantité doit être positive"),
  quantiteBL: z.coerce.number().min(0).optional().nullable(),
  resteQuantite: z.coerce.number().min(0).optional().nullable(),
  bonLivraisonNumero: z.string().optional().nullable(),
  dateBL: z.string().optional().nullable(),
  invoiceNumero: z.string().optional().nullable(),
  dateFact: z.string().optional().nullable(),
  bonLivraisonId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  ngpCodeId: z.string().optional().nullable(),
});

const exportSchema = z.object({
  tiersId: z.string().min(1, "Tiers requis"),
  dateCreation: z.string().optional(),
  decVente: z.string().optional().nullable(),
  dateDecVente: z.string().optional().nullable(),
  simultanee: z.string().optional().nullable(),
  dateSimultanee: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lines: z.array(exportLineSchema).default([]),
});

export const GET = apiRoute.get(
  { permission: "bonsLivraison:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") as string | null;

    const where: Record<string, unknown> = {};
    where.companyId = companyId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: "insensitive" } },
        { tiers: { raisonSociale: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [exports, total] = await Promise.all([
      prisma.export.findMany({
        where,
        include: {
          tiers: { select: { raisonSociale: true, ville: true } },
          lines: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.export.count({ where }),
    ]);

    const stats = {
      total,
      enCours: exports.filter((e) => e.status === "EN_COURS").length,
      valide: exports.filter((e) => e.status === "VALIDE").length,
      brouillon: exports.filter((e) => e.status === "BROUILLON").length,
    };

    const serialized = exports.map((e) => ({
      ...serializeDecimals(e),
      tiers: e.tiers,
      lines: serializeDecimals(e.lines),
    }));

    return { exports: serialized, stats };
  }
);

export const POST = apiRoute.post(
  { permission: "bonsLivraison:creer", requireCompany: true },
  async (request, { companyId }) => {
    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Données invalides", parsed.error.issues),
        { status: 400 }
      );
    }
    const data = parsed.data;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return NextResponse.json({ error: "Société introuvable" }, { status: 400 });
    const prefix = "EXP";
    const numero = await nextNumber("export", prefix, companyId);

    const exportDoc = await prisma.export.create({
      data: {
        numero,
        tiersId: data.tiersId,
        companyId,
        dateCreation: new Date(data.dateCreation ?? new Date()),
        decVente: data.decVente ?? null,
        dateDecVente: data.dateDecVente ? new Date(data.dateDecVente) : null,
        simultanee: data.simultanee ?? null,
        dateSimultanee: data.dateSimultanee ? new Date(data.dateSimultanee) : null,
        status: "BROUILLON",
        notes: data.notes ?? null,
        lines: {
          create: data.lines.map((line) => ({
            ngpCode: line.ngpCode ?? null,
            barcode: line.barcode ?? null,
            snNumero: line.snNumero ?? null,
            quantite: line.quantite.toFixed(3),
            quantiteBL: line.quantiteBL?.toFixed(3) ?? null,
            resteQuantite: line.resteQuantite?.toFixed(3) ?? null,
            bonLivraisonNumero: line.bonLivraisonNumero ?? null,
            dateBL: line.dateBL ? new Date(line.dateBL) : null,
            invoiceNumero: line.invoiceNumero ?? null,
            dateFact: line.dateFact ? new Date(line.dateFact) : null,
            bonLivraison: line.bonLivraisonId
              ? { connect: { id: line.bonLivraisonId } }
              : undefined,
            invoice: line.invoiceId
              ? { connect: { id: line.invoiceId } }
              : undefined,
            ngpCodeRel: line.ngpCodeId
              ? { connect: { id: line.ngpCodeId } }
              : undefined,
          })),
        },
      },
      include: {
        tiers: { select: { raisonSociale: true, ville: true } },
        lines: true,
      },
    });

    return NextResponse.json(
      { export: serializeDecimals(exportDoc) },
      { status: 201 }
    );
  }
);
