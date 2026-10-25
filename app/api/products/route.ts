import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { productSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import Big from "big.js";
import { StockStatus } from "@/prisma/generated/prisma/client";
import { generateProductQRData } from "@/lib/qr-data";

export const GET = apiRoute.get(
  { permission: "produits:voir" },
  async (request) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? "";
    const categorie = searchParams.get("categorie") ?? "";
    const stockStatus = searchParams.get("stockStatus") ?? "";
    const prixMin = searchParams.get("prixMin") ?? "";
    const prixMax = searchParams.get("prixMax") ?? "";
    const supplier = searchParams.get("supplier") ?? "";

    const products = await prisma.product.findMany({
      where: {
        AND: [
          search
            ? {
              OR: [
                { nom: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
                { codeBarre: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { categorie: { nom: { contains: search, mode: "insensitive" } } },
                { suppliers: { some: { supplier: { raisonSociale: { contains: search, mode: "insensitive" } } } } },
              ]
            }
            : {},
          categorie && categorie !== "ALL"
            ? { categorie: { nom: { equals: categorie, mode: "insensitive" } } }
            : {},
          stockStatus && stockStatus !== "ALL"
            ? { stockStatus: stockStatus as "OK" | "CRITIQUE" | "RUPTURE" }
            : {},
          prixMin ? { prixHT: { gte: parseFloat(prixMin) } } : {},
          prixMax ? { prixHT: { lte: parseFloat(prixMax) } } : {},
          supplier && supplier !== "ALL"
            ? { suppliers: { some: { supplierId: supplier } } }
            : {},
        ],
      },
      include: {
        categorie: { select: { id: true, nom: true } },
        marque: { select: { nom: true } },
        tiers: { select: { raisonSociale: true } },
        suppliers: {
          include: {
            supplier: { select: { id: true, raisonSociale: true } },
          },
        },
      },
      orderBy: { code: "asc" },
    });

    const totalValeur = products.reduce((acc, p) => acc.plus(new Big(p.prixHT.toString()).times(new Big(p.stockActuel.toString()))), new Big(0));

    const seen = new Set<string>();
    const categoryNames: string[] = [];
    for (const p of products) {
      if (p.categorie?.nom && !seen.has(p.categorie.nom)) {
        seen.add(p.categorie.nom);
        categoryNames.push(p.categorie.nom);
      }
    }

    const stats = {
      totalProduits: products.length,
      valeurStock: totalValeur.toFixed(3),
      alertesStock: products.filter((p) => p.stockStatus === "CRITIQUE" || p.stockStatus === "RUPTURE").length,
      categories: categoryNames.length,
    };

    const serialized = products.map((p) => ({
      ...serializeDecimals(p),
      categorieName: p.categorie?.nom ?? null,
      marqueName: p.marque?.nom ?? null,
      tiersName: p.tiers?.raisonSociale ?? null,
      suppliers: p.suppliers.map((ps) => ({
        productSupplierId: ps.id,
        supplierId: ps.supplierId,
        supplierName: ps.supplier.raisonSociale,
        purchasePrice: serializeDecimals(ps.purchasePrice),
        salePrice: ps.salePrice ? Number(ps.salePrice) : null,
        reference: ps.reference,
        isDefault: ps.isDefault,
      })),
    }));

    return NextResponse.json({ products: serialized, stats, categories: categoryNames });
  }
);

export const POST = apiRoute.post(
  { permission: "produits:creer" },
  async (request) => {
    try {
      const body = await request.json();
      const parsed = productSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(errorResponse("Données invalides", parsed.error.issues), { status: 400 });
      }

      const data = parsed.data;
      // For estSurCommande: stock=1 is the permanent sample floor, treat as effectiveStock=2
      const effectiveStock = data.estSurCommande && data.stockActuel <= 1 ? Math.max(data.stockActuel, 2) : data.stockActuel;
      const stockStatus: StockStatus = data.stockActuel <= 0 ? "RUPTURE" : effectiveStock <= data.stockMinimum ? "CRITIQUE" : "OK";

      let categorieNom: string | null = null;
      if (data.categorieId) {
        const cat = await prisma.categorie.findUnique({ where: { id: data.categorieId }, select: { nom: true } });
        categorieNom = cat?.nom ?? null;
      }

      const product = await prisma.product.create({
        data: {
          code: data.code,
          nom: data.nom,
          description: data.description ?? null,
          categorie: data.categorieId ? { connect: { id: data.categorieId } } : undefined,
          marque: data.marqueId ? { connect: { id: data.marqueId } } : undefined,
          tiers: data.tiersId ? { connect: { id: data.tiersId } } : undefined,
          photoUrl: data.photoUrl ?? null,
          ficheTechniqueUrl: data.ficheTechniqueUrl ?? null,
          prixHT: data.prixHT.toString(),
          tauxTVA: data.tauxTVA.toString(),
          fodec: data.fodec,
          tauxFodec: data.tauxFodec.toString(),
          stockActuel: data.stockActuel.toString(),
          stockMinimum: data.stockMinimum.toString(),
          unite: data.unite,
          estSurCommande: data.estSurCommande ?? false,
          quantiteParUnite: data.quantiteParUnite != null ? String(data.quantiteParUnite) : null,
          stockStatus,
          actif: data.actif,
        },
      });

      // Créer les fournisseurs associés
      if (data.suppliers && data.suppliers.length > 0) {
        const hasDefault = data.suppliers.some((s) => s.isDefault);
        await prisma.productSupplier.createMany({
          data: data.suppliers.map((s, index) => ({
            productId: product.id,
            supplierId: s.supplierId,
            purchasePrice: s.purchasePrice,
            reference: s.reference ?? null,
            isDefault: s.isDefault ?? (index === 0 && !hasDefault),
          })),
        });
      }

      const qrData = generateProductQRData({
        id: product.id,
        code: product.code,
        nom: product.nom,
        description: product.description,
        categorie: categorieNom,
        prixHT: product.prixHT.toString(),
        tauxTVA: product.tauxTVA.toString(),
        stockActuel: product.stockActuel.toString(),
        unite: product.unite,
      });

      const updated = await prisma.product.update({
        where: { id: product.id },
        data: { codeBarre: qrData },
      });

      return NextResponse.json({ product: serializeDecimals(updated) }, { status: 201 });
    } catch (error: unknown) {
      // Logique métier conservée dans le handler : le catch global du wrapper
      // transformerait ce P2002 en 500 au lieu du 409 attendu.
      if ((error as { code?: string }).code === "P2002") {
        return NextResponse.json(errorResponse("Code produit déjà utilisé"), { status: 409 });
      }
      throw error;
    }
  }
);
