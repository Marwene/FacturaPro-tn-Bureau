import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/schemas";
import { ServiceError } from "@/lib/service-error";
import { bonCommandeUpdateSchema } from "@/lib/schemas/document-updates";

/**
 * Mise à jour d'un bon de commande (statut / notes / remplacement des lignes) —
 * service partagé (lot H) entre `PATCH /api/bons-commande/[id]` et
 * `validateBonCommande` (`app/actions/bons-commande.ts`).
 *
 * Le wrapper `apiRoute` valide déjà le body sur le chemin route (`schema:` →
 * 422) ; le re-parse ici est idempotent et couvre le chemin server action, avec
 * le **même contrat 422** `{ error, issues, success }`.
 */
export async function updateBonCommande(
    id: string,
    companyId: string,
    rawBody: unknown
): Promise<Record<string, unknown>> {
    const parsed = bonCommandeUpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
        throw new ServiceError(422, {
            ...errorResponse("Données invalides"),
            issues: parsed.error.issues,
        });
    }

    const existing = await prisma.bonCommande.findFirst({ where: { id, companyId } });
    if (!existing) throw ServiceError.response(404, "Introuvable");

    const { status, notes, lines } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (lines) {
        // Garde-fou : cette opération remplace toutes les lignes (delete +
        // recreate), ce qui effacerait en cascade le détail (taille/couleur/
        // broderie/DTF) déjà importé et rapproché. On bloque tant qu'un
        // rapprochement a démarré sur au moins une ligne — il faut alors passer
        // par l'écran de détail dédié (/api/bons-commande/[id]/detail) pour
        // corriger, pas par ce PATCH.
        const lignesAvecDetail = await prisma.bonCommandeLine.findFirst({
            where: { bonCommandeId: id, details: { some: {} } },
            select: { id: true, description: true },
        });
        if (lignesAvecDetail) {
            throw ServiceError.response(
                409,
                `Impossible de remplacer les lignes : "${lignesAvecDetail.description}" a déjà un détail (taille/couleur/broderie/DTF) importé. Modifiez les lignes individuellement ou supprimez d'abord leur détail via l'écran de rapprochement.`
            );
        }

        let baseHT = 0, totalHT = 0, totalTVA = 0, totalFodec = 0, totalTTC = 0;

        let clientExonere = false;
        if (existing.tiersId) {
            const tiers = await prisma.tiers.findUnique({ where: { id: existing.tiersId }, select: { exonereTVA: true } });
            clientExonere = tiers?.exonereTVA ?? false;
        }

        const lineData = lines.map((l, i) => {
            const remise = Number(l.remise) || 0;
            const tauxTVA = clientExonere ? 0 : Number(l.tauxTVA) || 0;
            const qte = Number(l.quantite) || 0;
            const prix = Number(l.prixHT) || 0;
            const fodec = l.fodec === true;
            const tauxFodec = fodec ? Number(l.tauxFodec) || 1 : 0;
            const typeSource = l.typeSource;

            const remiseMontant = prix * (remise / 100);
            const htLigne = (prix - remiseMontant) * qte;
            const tvaLigne = htLigne * (tauxTVA / 100);
            const fodecLigne = fodec ? htLigne * (tauxFodec / 100) : 0;

            baseHT += prix * qte;
            totalHT += htLigne;
            totalTVA += tvaLigne;
            totalFodec += fodecLigne;
            totalTTC += htLigne + tvaLigne + fodecLigne;

            return {
                productId: l.productId || null,
                description: l.description || "",
                quantite: qte,
                prixHT: prix,
                remise,
                tauxTVA,
                fodec,
                tauxFodec,
                totalHT: htLigne,
                ordre: i,
                typeSource,
            };
        });

        updateData.baseHT = Number(baseHT.toFixed(4));
        updateData.totalHT = Number(totalHT.toFixed(4));
        updateData.totalTVA = Number(totalTVA.toFixed(4));
        updateData.totalFodec = Number(totalFodec.toFixed(4));
        updateData.totalTTC = Number(totalTTC.toFixed(4));

        await prisma.bonCommandeLine.deleteMany({ where: { bonCommandeId: id } });
        await prisma.bonCommandeLine.createMany({
            data: lineData.map((ld) => ({ ...ld, bonCommandeId: id })),
        });
    }

    const doc = await prisma.bonCommande.update({
        where: { id },
        data: updateData,
        include: {
            tiers: { select: { id: true, raisonSociale: true } },
            lines: { orderBy: { ordre: "asc" }, include: { product: { select: { id: true, nom: true, code: true } } } },
        },
    });

    return { data: doc };
}

/** Lecture unitaire du BC (GET partagé par la route `[id]` et la server action). */
export async function getBonCommande(id: string, companyId: string) {
    const doc = await prisma.bonCommande.findFirst({
        where: { id, companyId },
        include: {
            tiers: { select: { id: true, raisonSociale: true, matriculeFiscal: true, ville: true, adresse: true, telephone: true, exonereTVA: true } },
            lines: { orderBy: { ordre: "asc" }, include: { product: { select: { id: true, nom: true, code: true, prixHT: true } } } },
        },
    });
    if (!doc) throw ServiceError.response(404, "Bon de commande introuvable");
    return doc;
}
