import { apiRoute } from "@/lib/api-route";
import { withServiceErrors } from "@/lib/service-route";
import { extractBonCommandeDetailScan } from "@/lib/bon-commande/detail-extract";

// Extraction OCR déportée vers `lib/bon-commande/detail-extract.ts` (lot H),
// service partagé avec `extractBonCommandeDetailFromScan`
// (app/actions/bons-commande.ts) — plus de `fetch()`.
// Le corps est lu en **lazy** (`() => request.formData()`) : le service
// n'invoque la lecture qu'après son garde-fous 404 (finding W2 revue QA lot H),
// ordre historique `findFirst` → 404 → `await request.formData()` restauré.
export const POST = apiRoute.post(
    { permission: "bonsDeCommande:modifier", requireCompany: true },
    async (request, { params, companyId }) =>
        withServiceErrors(async () =>
            extractBonCommandeDetailScan(params.id, companyId, () => request.formData())
        )
);
