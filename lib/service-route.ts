import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/service-error";

/**
 * Lecture du corps JSON brut d'une requête, **hors** du fichier de route.
 *
 * Les services partagés (lot H) valident eux-mêmes le corps via `safeParse` et
 * lèvent `ServiceError` : la route ne fait que transmettre. Conserve le contrat
 * historique de `await request.json()` — JSON malformé → throw → **500**
 * `Erreur serveur` via le wrapper `apiRoute`.
 *
 * Quand un service porte un garde-fous d'existence **404**, la route le
 * transmet sous forme de thunk — `() => readRequestBody(request)` — et le
 * service n'invoque la lecture qu'**après** ce garde-fous : ordre historique
 * `findFirst` → 404 → lecture du corps restauré (finding W2 de la revue QA du
 * lot H). Un appel direct (`await readRequestBody(request)` en argument) reste
 * correct pour les routes dont l'ancien handler lisait le corps en premier
 * (créations : aucun garde-fous d'entité avant la lecture).
 */
export async function readRequestBody(request: Request): Promise<unknown> {
  return await request.json();
}

/**
 * Exécute un service partagé côté route.
 *
 * - `ServiceError` → `NextResponse` **statut + corps identiques** à l'ancien
 *   handler (`errorResponse(...)`, y compris les corps littéraux `{ error }`) ;
 * - toute autre erreur → rethrow : le wrapper `apiRoute` répond 500
 *   `Erreur serveur` + `requestId`, comme avant.
 */
export async function withServiceErrors<T>(run: () => Promise<T>): Promise<NextResponse | T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(error.body, { status: error.status });
    }
    throw error;
  }
}
