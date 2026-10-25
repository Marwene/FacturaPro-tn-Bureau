"use server";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permissions";
import { jsonPayload, throwRouteError } from "@/lib/service-error";
import { extractAchatScan } from "@/lib/achats/extract";
import type { ExtractedData as ScanExtractedData } from "@/lib/stores/achats-store";

// Server action du module Achats — **aucun tour HTTP** (lot H) : l'extraction
// OCR appelle directement le service `lib/achats/extract.ts`, partagé avec la
// route `POST /api/achats/extract`. Même ordre de contrôles que le wrapper
// `apiRoute` (session → permission), mêmes messages d'erreur historiques.
export async function extractAchatFromScan(
    formData: FormData
): Promise<{ extracted: ScanExtractedData }> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Non authentifié");

    // Route `POST /api/achats/extract` : `achats:creer`, sans `requireCompany` —
    // `getCompanyId` ne servait que de garde booléen sur le matching produit
    // (fallback `null`, jamais 403).
    const perm = checkPermission(session.user.role, session.user.permissions, "achats:creer");
    if (!perm.allowed) throw new Error(perm.error || "Erreur d'extraction");
    const companyId = session.user.companyId || null;

    try {
        // Historiquement la réponse passait par `res.json()` (typée `any`) : le
        // payload JSON **supprime** les clés `undefined` (`JSON.stringify`), alors
        // que le type consommateur (store) les déclare `string | null` — contrat
        // inchangé, seul le typage est rétabli ici (aucun `any`).
        const payload = jsonPayload(await extractAchatScan(formData, companyId));
        return payload as { extracted: ScanExtractedData };
    } catch (error) {
        throwRouteError(error, "Erreur d'extraction");
    }
}
