import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { nameToSkuPrefix } from "@/lib/product-code";

export const GET = apiRoute.get(
  // Aligné sur le gate lecture du module produits (Option A 2026-09-27, cf.
  // docs/wiki/inventaire.md) : la page produits qui appelle ce endpoint est
  // elle-même gateée `produits:voir` (GET /api/products le requiert déjà) →
  // aucun utilisateur actuel ne peut perdre l'accès.
  { permission: "produits:voir" },
  async (request) => {
    const { searchParams } = new URL(request.url);
    const nom = searchParams.get("nom") || undefined;
    const prefix = nom ? nameToSkuPrefix(nom) : "PROD";

    const lastProduct = await prisma.product.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: "desc" },
      select: { code: true },
    });

    const lastNum = lastProduct?.code
      ? parseInt(lastProduct.code.replace(/[^0-9]/g, ""), 10) || 0
      : 0;

    const nextNum = lastNum + 1;
    const code = `${prefix}-${String(nextNum).padStart(4, "0")}`;

    return { code };
  }
);
