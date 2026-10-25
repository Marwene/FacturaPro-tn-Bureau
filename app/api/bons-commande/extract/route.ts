import { apiRoute } from "@/lib/api-route";
import { getCompanyId } from "@/lib/session";
import { withServiceErrors } from "@/lib/service-route";
import { extractBonCommandeScan } from "@/lib/bon-commande/extract";

// Extraction OCR déportée vers `lib/bon-commande/extract.ts` (lot H), service
// partagé avec `extractBonCommandeFromScan` (app/actions/bons-commande.ts).
// `requireCompany` volontairement NON activé : `getCompanyId` (fallback `null`)
// sert ici de booléen de garde sur le matching produit, un `requireCompany: true`
// transformerait « produits vides » en 403 (décision tracée dans docs/wiki/bons-commande.md).
export const POST = apiRoute.post(
  { permission: "bonsDeCommande:creer" },
  async (request, { session }) =>
    withServiceErrors(async () =>
      extractBonCommandeScan(await request.formData(), await getCompanyId(request, session))
    )
);
