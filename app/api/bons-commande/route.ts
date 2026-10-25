import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { readRequestBody, withServiceErrors } from "@/lib/service-route";
import { createBonCommande } from "@/lib/bon-commande/create";

export const GET = apiRoute.get(
  { permission: "bonsDeCommande:voir", requireCompany: true },
  async (request, { companyId }) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = { companyId };
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { numero: { contains: search, mode: "insensitive" } },
        { tiers: { raisonSociale: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [data, total, countDraft, countAccepted] = await Promise.all([
      prisma.bonCommande.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          tiers: { select: { id: true, raisonSociale: true, matriculeFiscal: true, ville: true } },
          lines: { orderBy: { ordre: "asc" }, include: { product: { select: { id: true, nom: true, code: true } } } },
        },
      }),
      prisma.bonCommande.count({ where }),
      prisma.bonCommande.count({ where: { ...where, status: "BROUILLON" } }),
      prisma.bonCommande.count({ where: { ...where, status: "ACCEPTE" } }),
    ]);

    return { data, stats: { total, countDraft, countAccepted } };
  }
);

// Logique de création intégralement déportée vers le service partagé
// `lib/bon-commande/create.ts` (lot H) : appelé ici ET par
// `createBonCommandeFromExtraction` (app/actions/bons-commande.ts), sans HTTP.
export const POST = apiRoute.post(
  { permission: "bonsDeCommande:creer", requireCompany: true },
  async (request, { companyId }) =>
    withServiceErrors(async () => createBonCommande(await readRequestBody(request), companyId))
);
