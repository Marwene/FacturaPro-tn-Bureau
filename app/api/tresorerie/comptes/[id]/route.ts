/**
 * PATCH /api/tresorerie/comptes/[id] — lot D3.1 (audit 2026-10).
 *
 * Saisie du solde de départ d'un compte de trésorerie (CAISSE / BANQUE) et de
 * la date d'ouverture de sa fenêtre `dateSoldeInitial`. Aucun autre champ n'est
 * modifiable (pas de mass-assignment : le corps est validé par un schéma Zod
 * fermé). Les mutations « confirmer / annuler un mouvement » restent sur les
 * endpoints existants (`payments/[id]`, `effets/[id]`, `cheques/[id]`).
 *
 * Réponse : le compte sérialisé, à l'identique de `TresorerieCompte` renvoyé
 * par `GET /api/tresorerie` (`soldeInitial` format "0.000", `dateSoldeInitial`
 * ISO, `solde` recalculé avec la nouvelle fenêtre via `soldeReel`).
 * Le client invalide ensuite la query `["tresorerie"]`.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import { errorResponse } from "@/lib/schemas";
import {
    montantTND,
    soldeReel,
    toBig,
    type CompteTresorerieInput,
    type MouvementTresorerieInput,
} from "@/lib/tresorerie/compute";
import type { TresorerieCompte } from "@/lib/types/tresorerie";

/** Nombre max d'entiers compatible avec `Decimal(19, 4)` (15 entiers + 4 déc.). */
const MAX_ENTIERS_SOLDE = 15;

const updateSoldeInitialSchema = z.object({
    /** Montant positif ou nul, au plus 3 décimales (millimes TND). */
    soldeInitial: z
        .string()
        .regex(/^\d+(\.\d{1,3})?$/, {
            message: "soldeInitial doit être un montant positif avec au plus 3 décimales (ex. « 1250.500 »).",
        })
        .refine((valeur) => valeur.split(".")[0].length <= MAX_ENTIERS_SOLDE, {
            message: `soldeInitial trop grand : ${MAX_ENTIERS_SOLDE} chiffres maximum avant la virgule.`,
        }),
    /** ISO 8601. Absent = maintenant (la fenêtre s'ouvre à la saisie). */
    dateSoldeInitial: z.iso.datetime({ offset: true }).optional(),
});

type UpdateSoldeInitial = z.infer<typeof updateSoldeInitialSchema>;

export const PATCH = apiRoute.patch(
    { permission: "paiements:modifier", requireCompany: true },
    async (request: NextRequest, { params, companyId }) => {
        const { id } = params;

        const body: unknown = await request.json().catch(() => null);
        const parsed = updateSoldeInitialSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Données invalides", issues: parsed.error.issues },
                { status: 422 },
            );
        }
        const data: UpdateSoldeInitial = parsed.data;
        const dateSoldeInitial =
            data.dateSoldeInitial === undefined ? new Date() : new Date(data.dateSoldeInitial);

        // Multi-tenant : 404 si le compte n'appartient pas à la société.
        const existant = await prisma.compteTresorerie.findFirst({
            where: { id, companyId },
            select: { id: true },
        });
        if (!existant) {
            return NextResponse.json(errorResponse("Compte de trésorerie introuvable"), { status: 404 });
        }

        const compte = await prisma.compteTresorerie.update({
            where: { id, companyId },
            data: { soldeInitial: data.soldeInitial, dateSoldeInitial },
            select: { id: true, type: true, libelle: true, soldeInitial: true, dateSoldeInitial: true },
        });

        // Solde réalisé recalculé avec la NOUVELLE fenêtre dateSoldeInitial.
        const lignes = await prisma.mouvementTresorerie.findMany({
            where: { companyId, compteId: compte.id },
            select: {
                sens: true,
                mode: true,
                statut: true,
                montant: true,
                dateOperation: true,
                dateEcheance: true,
                annuleParId: true,
            },
        });
        const mouvements: MouvementTresorerieInput[] = lignes.map((ligne) => ({
            sens: ligne.sens,
            mode: ligne.mode,
            statut: ligne.statut,
            montant: ligne.montant,
            dateOperation: ligne.dateOperation,
            dateEcheance: ligne.dateEcheance,
            annuleParId: ligne.annuleParId,
        }));
        const compteEntree: CompteTresorerieInput = {
            soldeInitial: compte.soldeInitial,
            dateSoldeInitial: compte.dateSoldeInitial,
        };

        const compteSerialise: TresorerieCompte = {
            id: compte.id,
            type: compte.type,
            libelle: compte.libelle,
            soldeInitial: montantTND(toBig(compte.soldeInitial)),
            dateSoldeInitial: compte.dateSoldeInitial.toISOString(),
            solde: montantTND(soldeReel(compteEntree, mouvements)),
        };

        return { compte: compteSerialise };
    },
);
