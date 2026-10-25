import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiRoute } from "@/lib/api-route";
import {
    aPayer,
    aRecevoir,
    bigVersNombre,
    enRetard,
    estAnnule,
    montantTND,
    previsionnel,
    projectionHebdomadaire,
    soldeReel,
    toBig,
    ventilation,
    type MouvementTresorerieInput,
} from "@/lib/tresorerie/compute";
import type { TresorerieData, TresorerieEcheancierLigne, TresorerieVentilationMode } from "@/lib/types/tresorerie";
import type { Ventilation } from "@/lib/tresorerie/compute";

/**
 * Filtre optionnel `?compte=CAISSE|BANQUE` — lot D3.1 (audit 2026-10).
 * Absent : société entière, comportement historique strictement inchangé.
 * Présent : TOUTES les agrégations de la réponse sont restreintes au compte.
 */
const compteQuerySchema = z.enum(["CAISSE", "BANQUE"]);
type TypeCompteSelectionne = z.infer<typeof compteQuerySchema>;

/** Erreur de validation d'un paramètre de requête : 422 homogène `{ error, issues }`. */
function parametreInvalide(message: string, issues: unknown): NextResponse {
    return NextResponse.json({ error: message, issues }, { status: 422 });
}

const serializeVentilation = (v: Ventilation): Record<keyof Ventilation, TresorerieVentilationMode> => {
    const resultat = {} as Record<keyof Ventilation, TresorerieVentilationMode>;
    for (const mode of Object.keys(v) as Array<keyof Ventilation>) {
        resultat[mode] = {
            encaissements: montantTND(v[mode].encaissements),
            decaissements: montantTND(v[mode].decaissements),
            net: montantTND(v[mode].net),
        };
    }
    return resultat;
};

export const GET = apiRoute.get(
    { permission: "paiements:voir", requireCompany: true },
    async (request: NextRequest, { companyId }) => {
        const companyFilter = { companyId };

        const { searchParams } = new URL(request.url);
        const days = Math.min(Math.max(parseInt(searchParams.get("days") ?? "30") || 30, 30), 365);

        // ── 0. FILTRE DE COMPTE (optionnel, lot D3.1) ───────────────────────
        const compteParam = searchParams.get("compte");
        let compteSelectionne: TypeCompteSelectionne | null = null;
        if (compteParam !== null) {
            const parsedCompte = compteQuerySchema.safeParse(compteParam);
            if (!parsedCompte.success) {
                return parametreInvalide(
                    "Paramètre « compte » invalide : attendu « CAISSE » ou « BANQUE ».",
                    parsedCompte.error.issues,
                );
            }
            compteSelectionne = parsedCompte.data;
        }

        // Trois vues du même filtre Prisma : `{}` = aucune restriction.
        // - `filtreCompteType` : lignes de `comptes_tresorerie` ;
        // - `filtreMouvement` : écritures du grand livre rattachées au compte ;
        // - `filtreInstrument` : chèques / effets / paiements — ils n'ont pas de
        //   `compteId`, le rattachement passe par LEUR écriture au grand livre
        //   (source unique d'attribution, cf. `typeComptePour` dans ledger.ts).
        const filtreCompteType =
            compteSelectionne === null ? {} : { type: compteSelectionne };
        const filtreMouvement =
            compteSelectionne === null ? {} : { compte: { type: compteSelectionne } };
        const filtreInstrument =
            compteSelectionne === null
                ? {}
                : { mouvementsTresorerie: { some: { compte: { type: compteSelectionne } } } };

        const now = new Date();
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
        const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const cutoff30j = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // ── 1. GRAND LIVRE (source de vérité D2) ─────────────────────────────
        const [comptes, lignes] = await Promise.all([
            prisma.compteTresorerie.findMany({
                where: { ...companyFilter, ...filtreCompteType },
                select: { id: true, type: true, libelle: true, soldeInitial: true, dateSoldeInitial: true },
            }),
            prisma.mouvementTresorerie.findMany({
                where: { ...companyFilter, ...filtreMouvement },
                select: {
                    compteId: true,
                    sens: true,
                    mode: true,
                    statut: true,
                    montant: true,
                    dateOperation: true,
                    dateEcheance: true,
                    annuleParId: true,
                    invoiceId: true,
                    achatId: true,
                },
            }),
        ]);

        // Adaptation vers la vue PUR de compute.ts (aucun Number() sur un montant).
        const mouvements: MouvementTresorerieInput[] = lignes.map((l) => ({
            sens: l.sens,
            mode: l.mode,
            statut: l.statut,
            montant: l.montant,
            dateOperation: l.dateOperation,
            dateEcheance: l.dateEcheance,
            annuleParId: l.annuleParId,
        }));

        // Solde réalisé par compte (la fenêtre dateSoldeInitial est appliquée
        // par soldeReel) puis somme = solde actuel de la société.
        const parCompte = comptes.map((compte) => {
            const lignesCompte = lignes
                .filter((l) => l.compteId === compte.id)
                .map((l): MouvementTresorerieInput => ({
                    sens: l.sens,
                    mode: l.mode,
                    statut: l.statut,
                    montant: l.montant,
                    dateOperation: l.dateOperation,
                    dateEcheance: l.dateEcheance,
                    annuleParId: l.annuleParId,
                }));
            const solde = soldeReel(compte, lignesCompte);
            return {
                id: compte.id,
                type: compte.type,
                libelle: compte.libelle,
                soldeInitial: montantTND(toBig(compte.soldeInitial)),
                dateSoldeInitial: compte.dateSoldeInitial.toISOString(),
                solde: montantTND(solde),
                soldeBig: solde,
            };
        });
        const soldeActuelBig = parCompte.reduce((acc, c) => acc.plus(c.soldeBig), toBig(0));

        // Encours (PREVU) et retards : calculés sur le grand livre — cheques +
        // effets en attente ET paiements en attente (écart assumé vs D1, signalé
        // dans le rapport : le ledger est la seule source).
        const aRecevoirBig = aRecevoir(mouvements);
        const aPayerBig = aPayer(mouvements);
        const enRetardBig = enRetard(mouvements, now);
        const previsionnelBig = previsionnel(soldeActuelBig, aRecevoirBig, aPayerBig);

        // ── 2. MOUVEMENTS DU MOIS (groupBy : une seule requête, zéro Number()) ─
        const mouvementsMois = mouvements.filter(
            (m) => !estAnnule(m) && m.dateOperation >= debutMois && m.dateOperation <= finMois,
        );
        const ventilationMoisBig = ventilation(mouvementsMois, {
            debut: debutMois,
            fin: finMois,
            statuts: ["REALISE"],
        });
        const entreesMoisBig = mouvementsMois
            .filter((m) => m.statut === "REALISE" && m.sens === "ENCAISSEMENT")
            .reduce((acc, m) => acc.plus(toBig(m.montant)), toBig(0));
        const sortiesMoisBig = mouvementsMois
            .filter((m) => m.statut === "REALISE" && m.sens === "DECAISSEMENT")
            .reduce((acc, m) => acc.plus(toBig(m.montant)), toBig(0));

        // ── 3. ÉCHÉANCIER (futur + échéances PASSÉES encore prévues) + RÉCENTS ──
        // Aucune borne basse `gte: now` : une échéance passée encore non soldée
        // doit rester visible au détail, sous peine de désynchroniser le KPI
        // `solde.enRetard` (qui totalise, lui, toutes les échéances passées —
        // `enRetard()` sans borne, audit §5.5 / défaut T-6). Le front classe la
        // ligne « en retard » côté client (`date < aujourd'hui && statut prévu`).
        const [chequesEcheancier, effetsEcheancier, derniersPaiements] = await Promise.all([
            prisma.cheque.findMany({
                where: {
                    ...companyFilter,
                    ...filtreInstrument,
                    status: "EN_ATTENTE",
                    dateEcheance: { lte: horizon },
                },
                include: { tiers: { select: { raisonSociale: true } } },
                orderBy: { dateEcheance: "asc" },
            }),
            prisma.effet.findMany({
                where: {
                    ...companyFilter,
                    ...filtreInstrument,
                    status: { notIn: ["PAYE", "ANNULE"] },
                    dateEcheance: { lte: horizon },
                },
                include: {
                    tireur: { select: { raisonSociale: true } },
                    fournisseur: { select: { raisonSociale: true } },
                },
                orderBy: { dateEcheance: "asc" },
            }),
            prisma.payment.findMany({
                where: {
                    ...companyFilter,
                    ...filtreInstrument,
                    dateReglement: { gte: cutoff30j },
                    status: { not: "ANNULE" },
                },
                include: {
                    tiers: { select: { raisonSociale: true } },
                    cheque: { select: { numero: true, type: true } },
                    effet: { select: { numero: true, type: true } },
                },
                orderBy: { dateReglement: "desc" },
                take: 20,
            }),
        ]);

        const echeancier: TresorerieEcheancierLigne[] = [
            ...chequesEcheancier.map((c): TresorerieEcheancierLigne => ({
                date: c.dateEcheance.toISOString(),
                flux: c.type === "RECU" ? "entree" : "sortie",
                source: "cheque",
                montant: bigVersNombre(toBig(c.montant)),
                numero: c.numero,
                ordrePaiementNumero: c.numero,
                contrepartie: c.tiers?.raisonSociale ?? c.beneficiaire,
                status: c.status,
                type: c.type,
                id: c.id,
                chequeId: c.id,
            })),
            ...effetsEcheancier.map((e): TresorerieEcheancierLigne => ({
                date: e.dateEcheance.toISOString(),
                flux: e.type === "RECU" ? "entree" : "sortie",
                source: "effet",
                montant: bigVersNombre(toBig(e.montant)),
                numero: e.numero,
                ordrePaiementNumero: e.ordrePaiementNumero ?? e.numero,
                contrepartie: e.tireur?.raisonSociale ?? e.fournisseur?.raisonSociale ?? e.tire,
                status: e.status,
                type: e.type,
                id: e.id,
                effetId: e.id,
            })),
            ...derniersPaiements.map((p): TresorerieEcheancierLigne => {
                const flux = p.invoiceId ? "entree" : p.achatId ? "sortie" : "entree";
                return {
                    date: p.dateReglement.toISOString(),
                    flux,
                    source: p.methode === "EFFET" ? "effet" : p.methode === "CHEQUE" ? "cheque" : p.methode.toLowerCase() as "especes" | "virement" | "carte",
                    montant: bigVersNombre(toBig(p.montant)),
                    numero: p.id,
                    ordrePaiementNumero: p.reference ?? p.cheque?.numero ?? p.effet?.numero ?? p.id,
                    contrepartie: p.tiers?.raisonSociale ?? "—",
                    status: "REALISE",
                    type: p.chequeId ? "CHEQUE" : p.effetId ? "EFFET" : "DIRECT",
                    id: p.id,
                    paymentId: p.id,
                    chequeId: p.chequeId,
                    effetId: p.effetId,
                };
            }),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // ── 4. PROJECTION HEBDOMADAIRE (compute pur — retards en semaine 1) ──
        const projectionBig = projectionHebdomadaire({
            soldeDepart: soldeActuelBig,
            mouvements,
            debut: now,
            jours: days,
        });
        const projection = projectionBig.map((s) => ({
            semaine: s.semaine,
            debut: s.debut.toISOString(),
            entree: bigVersNombre(s.entrees),
            sortie: bigVersNombre(s.sorties),
            soldeEstime: bigVersNombre(s.soldeEstime),
        }));
        const projectionHorizonBig =
            projectionBig.length > 0 ? projectionBig[projectionBig.length - 1].soldeEstime : soldeActuelBig;

        // ── 5. RÉCENTS PAR MÉTHODE + COMPTEURS (groupBy) ────────────────────
        const [especes, virements, cartes, derniersEffets, derniersCheques, pendingCheques, methodCounts, countEffets, countCheques] =
            await Promise.all([
                prisma.payment.findMany({
                    where: { ...companyFilter, ...filtreInstrument, methode: "ESPECES", status: { not: "ANNULE" }, dateReglement: { gte: cutoff30j } },
                    include: { tiers: { select: { raisonSociale: true } } },
                    orderBy: { dateReglement: "desc" },
                    take: 5,
                }),
                prisma.payment.findMany({
                    where: { ...companyFilter, ...filtreInstrument, methode: "VIREMENT", status: { not: "ANNULE" }, dateReglement: { gte: cutoff30j } },
                    include: { tiers: { select: { raisonSociale: true } } },
                    orderBy: { dateReglement: "desc" },
                    take: 5,
                }),
                prisma.payment.findMany({
                    where: { ...companyFilter, ...filtreInstrument, methode: "CARTE", status: { not: "ANNULE" }, dateReglement: { gte: cutoff30j } },
                    include: { tiers: { select: { raisonSociale: true } } },
                    orderBy: { dateReglement: "desc" },
                    take: 5,
                }),
                prisma.effet.findMany({
                    where: { ...companyFilter, ...filtreInstrument, createdAt: { gte: cutoff30j } },
                    include: { tireur: { select: { raisonSociale: true } }, fournisseur: { select: { raisonSociale: true } } },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                }),
                prisma.cheque.findMany({
                    where: { ...companyFilter, ...filtreInstrument, createdAt: { gte: cutoff30j } },
                    include: { tiers: { select: { raisonSociale: true } } },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                }),
                prisma.cheque.findMany({
                    where: { ...companyFilter, ...filtreInstrument, status: "EN_ATTENTE" },
                    include: { tiers: { select: { raisonSociale: true } } },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                }),
                // groupBy : comptage par méthode en UNE requête (5 comptages
                // remplacés, les clés absentes valent 0).
                prisma.payment.groupBy({
                    by: ["methode"],
                    where: { ...companyFilter, ...filtreInstrument },
                    _count: { _all: true },
                }),
                prisma.effet.count({ where: { ...companyFilter, ...filtreInstrument } }),
                prisma.cheque.count({ where: { ...companyFilter, ...filtreInstrument } }),
            ]);

        const countsParMethode = new Map(
            methodCounts.map((m) => [m.methode, m._count._all]),
        );
        const countPaiements = methodCounts.reduce((acc, m) => acc + m._count._all, 0);

        return {
            solde: {
                actuel: montantTND(soldeActuelBig),
                aRecevoir: montantTND(aRecevoirBig),
                aPayer: montantTND(aPayerBig),
                enRetard: montantTND(enRetardBig),
                previsionnel: montantTND(previsionnelBig),
                entreesMois: montantTND(entreesMoisBig),
                sortiesMois: montantTND(sortiesMoisBig),
                especesMois: montantTND(ventilationMoisBig.ESPECES.encaissements),
                virementsMois: montantTND(ventilationMoisBig.VIREMENT.encaissements),
                cartesMois: montantTND(ventilationMoisBig.CARTE.encaissements),
                chequesMois: montantTND(ventilationMoisBig.CHEQUE.encaissements),
                projectionHorizon: montantTND(projectionHorizonBig),
            },
            echeancier,
            projection,
            ventilationMois: serializeVentilation(ventilationMoisBig),
            parCompte: parCompte.map((c) => ({
                id: c.id,
                type: c.type,
                libelle: c.libelle,
                soldeInitial: c.soldeInitial,
                dateSoldeInitial: c.dateSoldeInitial,
                solde: c.solde,
            })),
            recents: {
                paiements: derniersPaiements.map((p) => ({
                    id: p.id,
                    montant: bigVersNombre(toBig(p.montant)),
                    date: p.dateReglement.toISOString(),
                    methode: p.methode,
                    reference: p.reference,
                    status: p.status,
                    client: p.tiers?.raisonSociale ?? "—",
                    flux: p.invoiceId ? "entree" : p.achatId ? "sortie" : "entree",
                    chequeNumero: p.cheque?.numero ?? null,
                    effetNumero: p.effet?.numero ?? null,
                })),
                especes: especes.map((p) => ({
                    id: p.id,
                    montant: bigVersNombre(toBig(p.montant)),
                    date: p.dateReglement.toISOString(),
                    reference: p.reference,
                    status: p.status,
                    client: p.tiers?.raisonSociale ?? "—",
                })),
                virements: virements.map((p) => ({
                    id: p.id,
                    montant: bigVersNombre(toBig(p.montant)),
                    date: p.dateReglement.toISOString(),
                    reference: p.reference,
                    status: p.status,
                    client: p.tiers?.raisonSociale ?? "—",
                })),
                cartes: cartes.map((p) => ({
                    id: p.id,
                    montant: bigVersNombre(toBig(p.montant)),
                    date: p.dateReglement.toISOString(),
                    reference: p.reference,
                    status: p.status,
                    client: p.tiers?.raisonSociale ?? "—",
                })),
                effets: derniersEffets.map((e) => ({
                    id: e.id,
                    montant: bigVersNombre(toBig(e.montant)),
                    date: e.createdAt.toISOString(),
                    numero: e.numero,
                    type: e.type,
                    status: e.status,
                    contrepartie: e.tireur?.raisonSociale ?? e.fournisseur?.raisonSociale ?? e.tire,
                })),
                cheques: derniersCheques.map((c) => ({
                    id: c.id,
                    montant: bigVersNombre(toBig(c.montant)),
                    date: c.createdAt.toISOString(),
                    numero: c.numero,
                    type: c.type,
                    status: c.status,
                    beneficiaire: c.beneficiaire,
                })),
                pendingCheques: pendingCheques.map((c) => ({
                    id: c.id,
                    montant: bigVersNombre(toBig(c.montant)),
                    date: c.createdAt.toISOString(),
                    numero: c.numero,
                    type: c.type,
                    beneficiaire: c.beneficiaire,
                    client: c.tiers?.raisonSociale ?? null,
                })),
                counts: {
                    paiements: countPaiements,
                    especes: countsParMethode.get("ESPECES") ?? 0,
                    virements: countsParMethode.get("VIREMENT") ?? 0,
                    cartes: countsParMethode.get("CARTE") ?? 0,
                    effets: countEffets,
                    cheques: countCheques,
                },
            },
        } satisfies TresorerieData;
    }
);
