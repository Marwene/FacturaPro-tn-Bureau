import { apiRoute } from "@/lib/api-route";
import { getCompanyId } from "@/lib/session";
import { withServiceErrors } from "@/lib/service-route";
import { extractAchatScan } from "@/lib/achats/extract";

// Extraction OCR déportée vers `lib/achats/extract.ts` (lot H), service partagé
// avec `extractAchatFromScan` (app/actions/achats.ts). `requireCompany`
// volontairement NON activé : `getCompanyId` (fallback `null`) ne sert ici que
// de booléen de garde sur le matching produit (décision tracée dans
// docs/wiki/achats.md).
export const POST = apiRoute.post(
  { permission: "achats:creer" },
  async (request, { session }) =>
    withServiceErrors(async () =>
      extractAchatScan(await request.formData(), await getCompanyId(request, session))
    )
);
