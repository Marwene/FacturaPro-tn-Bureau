import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { bigVersNombre, estAnnule, toBig, type ModeReglementTresorerie } from "@/lib/tresorerie/compute";
import type { EvolutionMonth } from "@/lib/types/tresorerie";

const MOIS_VALUES = [3, 6, 9, 12] as const;
const MOIS_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const cleMois = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const GET = apiRoute.get(
    { permission: "paiements:voir", requireCompany: true },
    async (request, { companyId }) => {
        const { searchParams } = new URL(request.url);
        const moisRaw = parseInt(searchParams.get("mois") ?? "3");
        const mois = (MOIS_VALUES as readonly number[]).includes(moisRaw) ? (moisRaw as (typeof MOIS_VALUES)[number]) : 3;
        const flux = searchParams.get("flux") === "paiement" ? "paiement" : "encaissement";

        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - mois + 1, 1);

        // Le ledger est la source de vérité D2 : on somme les écritures REALISE
        // du sens demandé (flux « encaissement » = ENCAISSEMENT, « paiement » =
        // DECAISSEMENT), quel que soit le mode de règlement — les flux chèque et
        // effet y apparaissent donc pour la première fois.
        const sens = flux === "encaissement" ? "ENCAISSEMENT" : "DECAISSEMENT";

        const lignes = await prisma.mouvementTresorerie.findMany({
            where: {
                companyId,
                statut: "REALISE",
                sens,
                dateOperation: { gte: start },
            },
            select: { mode: true, dateOperation: true, montant: true, annuleParId: true, statut: true },
        });

        const months: EvolutionMonth[] = [];
        for (let i = 0; i < mois; i++) {
            const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
            months.push({
                mois: cleMois(d),
                label: `${MOIS_LABELS[d.getMonth()]} ${d.getFullYear()}`,
                especes: 0,
                virements: 0,
                cheques: 0,
                effets: 0,
                cartes: 0,
                entrees: 0,
                sorties: 0,
            });
        }

        const monthIndex = new Map(months.map((m) => [m.mois, m]));
        for (const ligne of lignes) {
            // estAnnule exclut les originales contre-passées (statut REALISE
            // conservé mais annuleParId renseigné) — cf. règle D1.
            if (estAnnule({ statut: ligne.statut, annuleParId: ligne.annuleParId })) continue;
            const entry = monthIndex.get(cleMois(ligne.dateOperation));
            if (!entry) continue;
            const montant = bigVersNombre(toBig(ligne.montant));
            const mode = ligne.mode as ModeReglementTresorerie;
            switch (mode) {
                case "ESPECES": entry.especes += montant; break;
                case "VIREMENT": entry.virements += montant; break;
                case "CARTE": entry.cartes += montant; break;
                case "CHEQUE": entry.cheques += montant; break;
                case "EFFET": entry.effets += montant; break;
            }
            // Par sens : le filtre ne garde qu'un seul sens par requête, donc
            // tout le montant tombe dans entrees OU sorties.
            if (sens === "ENCAISSEMENT") entry.entrees += montant;
            else entry.sorties += montant;
        }

        return { months };
    },
);
