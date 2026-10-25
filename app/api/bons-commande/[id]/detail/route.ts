import { apiRoute } from "@/lib/api-route";
import { readRequestBody, withServiceErrors } from "@/lib/service-route";
import { getBonCommandeDetail, saveBonCommandeDetailRows } from "@/lib/bon-commande/detail";

// Rapprochement déporté vers `lib/bon-commande/detail.ts` (lot H) : mêmes
// services appelés par les server actions `saveBonCommandeDetail` /
// `extractBonCommandeDetailFromScan` (app/actions/bons-commande.ts).
// GET : état de rapprochement complet du BC (toutes les lignes + leur détail + écarts)
export const GET = apiRoute.get(
    { permission: "bonsDeCommande:voir", requireCompany: true },
    async (_request, { params, companyId }) =>
        withServiceErrors(() => getBonCommandeDetail(params.id, companyId))
);

// POST : enregistre les lignes de détail confirmées par l'utilisateur (issues de
// l'extraction OCR ou saisies manuellement), puis relance le rapprochement.
// Le corps est lu en **lazy** (`() => readRequestBody(request)`) : le service
// n'invoque la lecture qu'après son garde-fous 404 (finding W2 revue QA lot H),
// ordre historique `findFirst` → 404 → `await request.json()` restauré.
export const POST = apiRoute.post(
    { permission: "bonsDeCommande:modifier", requireCompany: true },
    async (request, { params, companyId }) =>
        withServiceErrors(async () =>
            saveBonCommandeDetailRows(params.id, companyId, () => readRequestBody(request))
        )
);
