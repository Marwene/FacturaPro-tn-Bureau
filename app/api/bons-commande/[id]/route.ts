import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { apiRoute } from "@/lib/api-route";
import { withServiceErrors } from "@/lib/service-route";
import { bonCommandeUpdateSchema } from "@/lib/schemas/document-updates";
import { getBonCommande, updateBonCommande } from "@/lib/bon-commande/update";

// Lecture + mise à jour déportées vers `lib/bon-commande/update.ts` (lot H) :
// le même service est appelé par `validateBonCommande`
// (app/actions/bons-commande.ts), sans tour HTTP.
export const GET = apiRoute.get(
  { permission: "bonsDeCommande:voir", requireCompany: true },
  async (_request, { params, companyId }) =>
    withServiceErrors(async () => ({ data: await getBonCommande(params.id, companyId) }))
);

export const PATCH = apiRoute.patch(
  { permission: "bonsDeCommande:modifier", requireCompany: true, schema: bonCommandeUpdateSchema },
  async (_request, { params, companyId, body }) =>
    withServiceErrors(() => updateBonCommande(params.id, companyId, body))
);

export const DELETE = apiRoute.delete(
  { permission: "bonsDeCommande:supprimer", requireCompany: true },
  async (request, { params, companyId }) => {
    const { id } = params;
    const existing = await prisma.bonCommande.findFirst({ where: { id, companyId } });
    if (!existing) return NextResponse.json(errorResponse("Introuvable"), { status: 404 });

    await prisma.bonCommande.delete({ where: { id } });
    return { success: true };
  }
);
