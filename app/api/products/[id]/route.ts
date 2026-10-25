import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-route";
import { productSchema, errorResponse } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { StockStatus } from "@/prisma/generated/prisma/client";
import { generateProductQRData } from "@/lib/qr-data";

export const GET = apiRoute.get(
    { permission: "produits:voir" },
    async (_request, { params }) => {
        const { id } = params;
        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                categorie: { select: { id: true, nom: true } },
                marque: { select: { nom: true } },
                tiers: { select: { raisonSociale: true } },
                variants: { orderBy: { ordre: "asc" } },
                suppliers: {
                    include: {
                        supplier: { select: { id: true, raisonSociale: true } },
                    },
                },
            },
        });
        if (!product) {
            return NextResponse.json(errorResponse("Produit introuvable"), { status: 404 });
        }
        const defaultSupplier = product.suppliers.find((s) => s.isDefault);
        const serialized = {
            ...serializeDecimals(product),
            categorieName: product.categorie?.nom ?? null,
            marqueName: product.marque?.nom ?? null,
            tiersName: product.tiers?.raisonSociale ?? null,
            prixAchatDefault: defaultSupplier ? Number(defaultSupplier.purchasePrice) : null,
            suppliers: product.suppliers.map((s) => ({
                id: s.id,
                supplierId: s.supplierId,
                supplierName: s.supplier.raisonSociale,
                purchasePrice: Number(s.purchasePrice),
                salePrice: s.salePrice ? Number(s.salePrice) : null,
                reference: s.reference,
                isDefault: s.isDefault,
            })),
            variants: product.variants.map((v) => ({
                ...serializeDecimals(v),
                attributs: v.attributs as Record<string, string> | null,
            })),
        };
        return NextResponse.json({ product: serialized });
    }
);

export const PUT = apiRoute.put(
    { permission: "produits:modifier" },
    async (request, { params }) => {
        try {
            const { id } = params;
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

            const product = await prisma.product.update({
                where: { id },
                data: {
                    code: data.code,
                    nom: data.nom,
                    description: data.description ?? null,
                    categorie: data.categorieId ? { connect: { id: data.categorieId } } : { disconnect: true },
                    marque: data.marqueId ? { connect: { id: data.marqueId } } : { disconnect: true },
                    tiers: data.tiersId ? { connect: { id: data.tiersId } } : { disconnect: true },
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

            // Synchroniser les fournisseurs
            if (data.suppliers !== undefined) {
                // Supprimer les anciens
                await prisma.productSupplier.deleteMany({
                    where: { productId: id },
                });
                // Créer les nouveaux
                if (data.suppliers.length > 0) {
                    const hasDefault = data.suppliers.some((s) => s.isDefault);
                    await prisma.productSupplier.createMany({
                        data: data.suppliers.map((s, index) => ({
                            productId: id,
                            supplierId: s.supplierId,
                            purchasePrice: s.purchasePrice,
                            reference: s.reference ?? null,
                            isDefault: s.isDefault ?? (index === 0 && !hasDefault),
                        })),
                    });
                }
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
                where: { id },
                data: { codeBarre: qrData },
            });

            return NextResponse.json({ product: serializeDecimals(updated) });
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

export const DELETE = apiRoute.delete(
    { permission: "produits:supprimer" },
    async (_request, { params }) => {
        const { id } = params;
        await prisma.product.delete({ where: { id } });
        return NextResponse.json({ success: true });
    }
);
