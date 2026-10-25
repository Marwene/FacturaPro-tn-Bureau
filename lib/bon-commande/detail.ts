import { prisma } from "@/lib/prisma";
import { serializeDecimals } from "@/lib/decimal";
import { ServiceError } from "@/lib/service-error";
import { saveDetailSchema } from "@/lib/schemas/bon-commande";
import { reconcileBonCommande } from "@/lib/bon-commande/reconciliation";

/**
 * Rapprochement d'un bon de commande (lignes + détail taille/couleur/broderie/DTF)
 * — services partagés (lot H) entre `app/api/bons-commande/[id]/detail` et les
 * server actions `saveBonCommandeDetail` / `extractBonCommandeDetailFromScan`.
 */

/** GET : état de rapprochement complet du BC (toutes les lignes + leur détail + écarts). */
export async function getBonCommandeDetail(id: string, companyId: string) {
    const bonCommande = await prisma.bonCommande.findFirst({
        where: { id, companyId },
        select: { id: true, numero: true },
    });
    if (!bonCommande) throw ServiceError.response(404, "Bon de commande introuvable");

    const lignes = await prisma.bonCommandeLine.findMany({
        where: { bonCommandeId: id },
        orderBy: { ordre: "asc" },
        include: {
            product: { select: { id: true, code: true, nom: true } },
            details: { orderBy: { createdAt: "asc" } },
            ordresFabrication: {
                select: { id: true, code: true, statut: true, quantite: true },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    return { bonCommande, lignes: serializeDecimals(lignes) };
}

/**
 * POST : enregistre les lignes de détail confirmées par l'utilisateur (issues de
 * l'extraction OCR ou saisies manuellement), puis relance le rapprochement.
 *
 * `readBody` est une **lecture différée du corps** : elle n'est invoquée
 * qu'APRÈS le garde-fous d'existence 404 ci-dessous — l'ordre exact de
 * l'ancien handler (`findFirst` → 404 → `await request.json()`), imposé par le
 * finding W2 de la revue QA du lot H (BC inexistante + corps malformé doit
 * répondre **404**, pas 500). La route passe `() => readRequestBody(request)`,
 * la server action `async () => data` (déjà parsée : lecture immédiate).
 */
export async function saveBonCommandeDetailRows(
    id: string,
    companyId: string,
    readBody: () => Promise<unknown>
): Promise<Record<string, unknown>> {
    const bonCommande = await prisma.bonCommande.findFirst({
        where: { id, companyId },
        select: { id: true },
    });
    if (!bonCommande) throw ServiceError.response(404, "Bon de commande introuvable");

    const rawBody = await readBody();
    const parsed = saveDetailSchema.safeParse(rawBody);
    if (!parsed.success) {
        throw ServiceError.response(400, "Données invalides", parsed.error.issues);
    }

    const { sourceDocument, rows } = parsed.data;

    // Toutes les lignes référencées doivent bien appartenir à ce BC (isolation multi-tenant).
    const lineIds = [...new Set(rows.map((r) => r.bonCommandeLineId))];
    const lignesValides = await prisma.bonCommandeLine.findMany({
        where: { id: { in: lineIds }, bonCommandeId: id },
        select: { id: true },
    });
    const idsValides = new Set(lignesValides.map((l) => l.id));
    const invalides = lineIds.filter((lid) => !idsValides.has(lid));
    if (invalides.length > 0) {
        throw ServiceError.response(400, "Certaines lignes ne correspondent pas à ce bon de commande", invalides);
    }

    await prisma.bonCommandeLigneDetail.createMany({
        data: rows.map((r) => ({
            bonCommandeLineId: r.bonCommandeLineId,
            variantId: r.variantId || null,
            taille: r.taille || null,
            couleur: r.couleur || null,
            broderie: r.broderie || null,
            impressionDtf: r.impressionDtf || null,
            quantite: r.quantite,
            sourceDocument: sourceDocument || null,
        })),
    });

    const rapprochement = await reconcileBonCommande(id);

    return { rapprochement };
}
