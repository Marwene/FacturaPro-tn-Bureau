import { NextRequest, NextResponse } from "next/server";
import { achatSchema } from "@/lib/schemas/achat";
import { errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { nextNumber } from "@/lib/sequence";
import Big from "big.js";
import { AchatStatus, AchatType, StockStatus } from "@/prisma/generated/prisma/client";
import { apiRoute } from "@/lib/api-route";
import { generateProductQRData } from "@/lib/qr-data";

export const GET = apiRoute.get(
  { permission: "achats:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") as AchatStatus | null;
    const type = searchParams.get("type") as AchatType | null;
    const tiersId = searchParams.get("tiersId");

    const where = {
      AND: [
        { companyId },
        status ? { status } : {},
        type ? { type } : {},
        tiersId ? { tiersId } : {},
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

    const achats = await prisma.achat.findMany({
      where,
      include: {
        tiers: {
          select: {
            id: true,
            raisonSociale: true,
            ville: true,
            matriculeFiscal: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const [stats, validees, brouillons, parCategorie] = await Promise.all([
      prisma.achat.aggregate({
        where,
        _sum: { totalTTC: true },
        _count: true,
      }),
      prisma.achat.count({ where: { ...where, status: "VALIDEE" } }),
      prisma.achat.count({ where: { ...where, status: "BROUILLON" } }),
      prisma.achat.groupBy({
        by: ["categorieAchat"],
        where: { ...where, status: "VALIDEE" },
        _sum: { totalTTC: true },
        _count: true,
      }),
    ]);

    return {
      achats: serializeDecimals(achats),
      stats: {
        total: stats._count,
        totalTTC: stats._sum.totalTTC?.toString() ?? "0",
        validees,
        brouillons,
      },
      parCategorie: parCategorie.map((g) => ({
        categorie: g.categorieAchat,
        totalTTC: g._sum.totalTTC?.toString() ?? "0",
        count: g._count,
      })),
    };
  }
);

export const POST = apiRoute.post(
  { permission: "achats:creer", requireCompany: true },
  async (request, { companyId }) => {
    const body = await request.json();
    const parsed = achatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Données invalides", parsed.error.issues),
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.tiersId) {
      const tiers = await prisma.tiers.findUnique({
        where: { id: data.tiersId },
      });

      if (!tiers) {
        return NextResponse.json(errorResponse("Fournisseur introuvable"), {
          status: 404,
        });
      }
    } else if (!(data.createFournisseur && data.fournisseur?.raisonSociale)) {
      return NextResponse.json(errorResponse("Fournisseur requis"), {
        status: 400,
      });
    }

    const bl = data.blAchatId
      ? await prisma.achat.findFirst({ where: { id: data.blAchatId, companyId, type: "BL" } })
      : null;
    if (data.blAchatId && !bl) {
      return NextResponse.json(errorResponse("BL d'achat introuvable ou incohérent"), { status: 400 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return NextResponse.json({ error: "Société introuvable" }, { status: 400 });
    const prefix = data.type === "BL" ? (company?.prefixeBLAchat ?? "BL-A") : (company?.prefixeAchat ?? "ACH");
    const numero = await nextNumber(data.type === "BL" ? "achat-bl" : "achat", prefix, companyId);

    const achat = await prisma.$transaction(async (tx) => {
      let tiersId: string = data.tiersId ?? "";

      if (!tiersId && data.createFournisseur && data.fournisseur?.raisonSociale) {
        const f = data.fournisseur;
        let tiers = f.matriculeFiscal
          ? await tx.tiers.findUnique({ where: { matriculeFiscal: f.matriculeFiscal } })
          : await tx.tiers.findFirst({
              where: { raisonSociale: { equals: f.raisonSociale, mode: "insensitive" }, isFournisseur: true },
            });

        if (!tiers) {
          try {
            tiers = await tx.tiers.create({
              data: {
                code: await nextNumber("fournisseur", "F-", companyId),
                raisonSociale: f.raisonSociale,
                matriculeFiscal: f.matriculeFiscal ?? null,
                adresse: f.adresse ?? null,
                ville: f.ville ?? null,
                telephone: f.telephone ?? null,
                email: f.email ?? null,
                isClient: false,
                isFournisseur: true,
              },
            });
          } catch (error: unknown) {
            if ((error as { code?: string }).code === "P2002" && f.matriculeFiscal) {
              const duplicate = await tx.tiers.findUnique({ where: { matriculeFiscal: f.matriculeFiscal } });
              if (duplicate) tiers = duplicate;
              else throw error;
            } else {
              throw error;
            }
          }
        }

        tiersId = tiers.id;
      }

      let baseHT = new Big(0);
      let totalHT = new Big(0);
      let totalTVA = new Big(0);

      const lines: {
        productId: string | null;
        description: string;
        quantite: string;
        prixAchat: string;
        remise: string;
        tauxTVA: string;
        totalHT: string;
        ordre: number;
      }[] = [];

      for (const [i, line] of data.lines.entries()) {
        let productId = line.productId ?? null;

        if (!productId && line.createProduct && line.description) {
          const product = await tx.product.create({
            data: {
              code: await nextNumber("produit", "P-", companyId),
              nom: line.description,
              description: line.description,
              prixHT: line.prixAchat.toString(),
              prixAchat: line.prixAchat.toString(),
              tauxTVA: line.tauxTVA.toString(),
              tiersId,
              unite: "Pièce",
              stockActuel: "0",
              stockMinimum: "0",
              stockStatus: "RUPTURE" as StockStatus,
              actif: true,
            },
          });

          await tx.product.update({
            where: { id: product.id },
            data: {
              codeBarre: generateProductQRData({
                id: product.id,
                code: product.code,
                nom: product.nom,
                description: product.description,
                categorie: null,
                prixHT: product.prixHT.toString(),
                tauxTVA: product.tauxTVA.toString(),
                stockActuel: "0",
                unite: "Pièce",
              }),
            },
          });

          productId = product.id;
        }

        const qty = new Big(line.quantite);
        const prix = new Big(line.prixAchat);
        const remFactor = new Big(1).minus(new Big(line.remise).div(100));
        const lineHT = qty.times(prix).times(remFactor);
        const lineTVA = lineHT.times(new Big(line.tauxTVA).div(100));

        baseHT = baseHT.plus(lineHT);
        totalHT = totalHT.plus(lineHT);
        totalTVA = totalTVA.plus(lineTVA);

        lines.push({
          productId,
          description: line.description,
          quantite: qty.toFixed(3),
          prixAchat: prix.toFixed(4),
          remise: new Big(line.remise).toFixed(2),
          tauxTVA: new Big(line.tauxTVA).toFixed(2),
          totalHT: lineHT.toFixed(4),
          ordre: i + 1,
        });
      }

      const finalHT = data.totalHT != null ? new Big(data.totalHT) : totalHT;
      const finalTVA = data.totalTVA != null ? new Big(data.totalTVA) : totalTVA;
      const finalTTC = data.totalTTC != null ? new Big(data.totalTTC) : finalHT.plus(finalTVA).plus(new Big(data.timbreFiscal));

      return tx.achat.create({
        data: {
          numero,
          tiersId,
          companyId,
          dateFacture: new Date(data.dateFacture),
          dateEcheance: data.dateEcheance ? new Date(data.dateEcheance) : null,
          referenceFournisseur: data.referenceFournisseur ?? null,
          type: data.type,
          baseHT: finalHT.toFixed(4),
          totalHT: finalHT.toFixed(4),
          totalTVA: finalTVA.toFixed(4),
          totalTTC: finalTTC.toFixed(4),
          timbreFiscal: data.timbreFiscal.toString(),
          resteAPayer: finalTTC.toFixed(4),
          status: "BROUILLON",
          notes: data.notes ?? null,
          categorieAchat: data.categorieAchat ?? null,
          blAchatId: data.blAchatId ?? null,
          lines: {
            create: lines,
          },
        },
        include: {
          tiers: true,
          lines: { include: { product: true } },
        },
      });
    });

    return NextResponse.json(
      { achat: serializeDecimals(achat) },
      { status: 201 }
    );
  }
);
