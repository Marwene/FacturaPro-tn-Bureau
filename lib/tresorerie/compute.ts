/**
 * Calcul pur de la trésorerie — lot D2 (audit 2026-10-07 §5.4).
 *
 * MODULE PUR : ni accès base de données, ni import du client Prisma.
 * Toute l'arithmétique est faite en Big.js (exacte) — AUCUN `Number()` sur un
 * montant, arrondi final à 3 décimales (millimes TND), arrondi commercial.
 *
 * Règles (décisions Governor / utilisateur en D1, à ne pas enfreindre) :
 * - `soldeReel` = soldeInitial + Σ(REALISE ∧ ENCAISSEMENT ∧ date ≥ dateSoldeInitial)
 *                 − Σ(REALISE ∧ DECAISSEMENT ∧ date ≥ dateSoldeInitial)
 * - les lignes `A_QUALIFIER` (sens ou statut) et `ANNULE` n'entrent dans AUCUNE somme ;
 * - `aRecevoir` = Σ(PREVU ∧ ENCAISSEMENT), `aPayer` = Σ(PREVU ∧ DECAISSEMENT) ;
 * - `enRetard` = PREVU dont `dateEcheance` est passée — totalisé À PART ;
 * - `previsionnel` = soldeReel + aRecevoir − aPayer ;
 * - contre-passation : l'originale reste REALISE (annulée via `annuleParId`),
 *   l'écriture inverse REALISE au sens opposé compense exactement.
 */
import Big from "big.js";

/** Précision monétaire TND : 3 décimales (millimes). */
export const DECIMALES_TND = 3;

export type SensMouvementTresorerie = "ENCAISSEMENT" | "DECAISSEMENT" | "A_QUALIFIER";
export type ModeReglementTresorerie = "ESPECES" | "CHEQUE" | "VIREMENT" | "EFFET" | "CARTE";
export type StatutMouvementTresorerie = "PREVU" | "REALISE" | "ANNULE" | "A_QUALIFIER";

/** Les 5 modes de règlement — EFFET inclus (corrige l'affichage historique à 4 modes). */
export const MODES_REGLEMENT: readonly ModeReglementTresorerie[] = [
    "ESPECES",
    "CHEQUE",
    "VIREMENT",
    "EFFET",
    "CARTE",
];

/**
 * Vue structurelle d'un `Decimal` Prisma / Big.js : suffisant pour l'arithmétique
 * sans importer le client Prisma (le module doit rester pur).
 */
export interface DecimalLike {
    toString(): string;
}

export interface CompteTresorerieInput {
    soldeInitial: DecimalLike;
    dateSoldeInitial: Date;
}

export interface MouvementTresorerieInput {
    sens: SensMouvementTresorerie;
    mode: ModeReglementTresorerie;
    statut: StatutMouvementTresorerie;
    montant: DecimalLike;
    dateOperation: Date;
    dateEcheance?: Date | null;
    /** Present sur une écriture originale annulée par contre-passation. */
    annuleParId?: string | null;
}

/* ─── Conversions ─────────────────────────────────────────────────────────── */

export function toBig(valeur: DecimalLike | string): Big {
    return new Big(typeof valeur === "string" ? valeur : valeur.toString());
}

/** Arrondi à la précision TND (3 décimales), arrondi commercial (half-up). */
export function arrondiTND(valeur: Big): Big {
    return valeur.round(DECIMALES_TND, Big.roundHalfUp);
}

/** Formattage monétaire canonique ("600.000") — à transmettre au client. */
export function montantTND(valeur: Big): string {
    return arrondiTND(valeur).toFixed(DECIMALES_TND);
}

/**
 * Conversion Big → number POUR L'AFFICHAGE UNIQUEMENT (graphiques Recharts,
 * échéancier côté UI qui additionne déjà des nombres). Jamais utilisé dans un
 * calcul de solde.
 */
export function bigVersNombre(valeur: Big): number {
    return parseFloat(arrondiTND(valeur).toFixed(DECIMALES_TND));
}

/* ─── Prédicats ───────────────────────────────────────────────────────────── */

/**
 * Prédicat « annulé », DÉFINITION UNIQUE du repo (réutilisée en D3).
 * Une écriture est annulée si son statut est ANNULE (annulation d'un PREVU,
 * sans écriture inverse) OU si elle porte un lien de contre-passation
 * (annulation d'un REALISE : l'originale reste REALISE).
 */
export function estAnnule(mouvement: Pick<MouvementTresorerieInput, "statut" | "annuleParId">): boolean {
    return mouvement.statut === "ANNULE" || (mouvement.annuleParId ?? null) !== null;
}

/** Une écriture entre-t-elle dans la fenêtre du solde du compte ? */
export function dansFenetreSolde(
    mouvement: Pick<MouvementTresorerieInput, "dateOperation">,
    compte: CompteTresorerieInput,
): boolean {
    return mouvement.dateOperation.getTime() >= compte.dateSoldeInitial.getTime();
}

/* ─── Soldes ──────────────────────────────────────────────────────────────── */

/**
 * Solde réalisé d'un compte : soldeInitial + encaissements réalisés − décaissements
 * réalisés, filtrés sur `dateOperation >= dateSoldeInitial`.
 * Les lignes PREVU, ANNULE et A_QUALIFIER n'y entrent PAS.
 */
export function soldeReel(compte: CompteTresorerieInput, mouvements: readonly MouvementTresorerieInput[]): Big {
    let total = toBig(compte.soldeInitial);
    for (const mouvement of mouvements) {
        if (mouvement.statut !== "REALISE") continue;
        if (!dansFenetreSolde(mouvement, compte)) continue;
        if (mouvement.sens === "ENCAISSEMENT") {
            total = total.plus(toBig(mouvement.montant));
        } else if (mouvement.sens === "DECAISSEMENT") {
            total = total.minus(toBig(mouvement.montant));
        }
        // sens A_QUALIFIER : exclu de toute somme.
    }
    return arrondiTND(total);
}

/** Σ des encaissements prévus (encours à recevoir). */
export function aRecevoir(mouvements: readonly MouvementTresorerieInput[]): Big {
    return sommePrevu(mouvements, "ENCAISSEMENT");
}

/** Σ des décaissements prévus (encours à payer). */
export function aPayer(mouvements: readonly MouvementTresorerieInput[]): Big {
    return sommePrevu(mouvements, "DECAISSEMENT");
}

function sommePrevu(
    mouvements: readonly MouvementTresorerieInput[],
    sens: "ENCAISSEMENT" | "DECAISSEMENT",
): Big {
    let total = new Big(0);
    for (const mouvement of mouvements) {
        if (mouvement.statut !== "PREVU" || mouvement.sens !== sens) continue;
        total = total.plus(toBig(mouvement.montant));
    }
    return arrondiTND(total);
}

/**
 * Total des échéances PREVU déjà passées (totalisé à part : ni dans aRecevoir
 * ni dans aPayer, jamais mélangé au solde).
 */
export function enRetard(mouvements: readonly MouvementTresorerieInput[], aujourdhui: Date): Big {
    let total = new Big(0);
    for (const mouvement of mouvements) {
        if (mouvement.statut !== "PREVU") continue;
        if (mouvement.sens !== "ENCAISSEMENT" && mouvement.sens !== "DECAISSEMENT") continue;
        const echeance = mouvement.dateEcheance ?? null;
        if (echeance === null || echeance.getTime() >= aujourdhui.getTime()) continue;
        total = total.plus(toBig(mouvement.montant));
    }
    return arrondiTND(total);
}

/** Ventilation d'un sous-ensemble d'échéances en retard, par sens. */
export function enRetardParSens(
    mouvements: readonly MouvementTresorerieInput[],
    aujourdhui: Date,
): { entrees: Big; sorties: Big } {
    let entrees = new Big(0);
    let sorties = new Big(0);
    for (const mouvement of mouvements) {
        if (mouvement.statut !== "PREVU") continue;
        const echeance = mouvement.dateEcheance ?? null;
        if (echeance === null || echeance.getTime() >= aujourdhui.getTime()) continue;
        if (mouvement.sens === "ENCAISSEMENT") entrees = entrees.plus(toBig(mouvement.montant));
        else if (mouvement.sens === "DECAISSEMENT") sorties = sorties.plus(toBig(mouvement.montant));
    }
    return { entrees: arrondiTND(entrees), sorties: arrondiTND(sorties) };
}

/** Prévisionnel = soldeRéel + à recevoir − à payer. */
export function previsionnel(solde: Big, recevoir: Big, payer: Big): Big {
    return arrondiTND(solde.plus(recevoir).minus(payer));
}

/* ─── Ventilation par mode ET par sens ────────────────────────────────────── */

export interface VentilationMode {
    encaissements: Big;
    decaissements: Big;
    net: Big;
}

export type Ventilation = Record<ModeReglementTresorerie, VentilationMode>;

export interface FiltreVentilation {
    /** Inclusif. */
    debut?: Date;
    /** Inclusif. */
    fin?: Date;
    /** Défaut : REALISE uniquement (les flux constatés). */
    statuts?: readonly StatutMouvementTresorerie[];
}

function ventilationVide(): Ventilation {
    const ventilation = {} as Record<ModeReglementTresorerie, VentilationMode>;
    for (const mode of MODES_REGLEMENT) {
        ventilation[mode] = { encaissements: new Big(0), decaissements: new Big(0), net: new Big(0) };
    }
    return ventilation;
}

/**
 * Ventilation par mode de règlement ET par sens sur une fenêtre donnée.
 * Les lignes de sens A_QUALIFIER et les statuts hors filtre sont exclus.
 */
export function ventilation(
    mouvements: readonly MouvementTresorerieInput[],
    filtre: FiltreVentilation = {},
): Ventilation {
    const statuts = filtre.statuts ?? ["REALISE"];
    const ventilation = ventilationVide();
    const accumulateurs = new Map<ModeReglementTresorerie, { enc: Big; dec: Big }>();
    for (const mode of MODES_REGLEMENT) {
        accumulateurs.set(mode, { enc: new Big(0), dec: new Big(0) });
    }

    for (const mouvement of mouvements) {
        if (!statuts.includes(mouvement.statut)) continue;
        if (filtre.debut !== undefined && mouvement.dateOperation < filtre.debut) continue;
        if (filtre.fin !== undefined && mouvement.dateOperation > filtre.fin) continue;
        if (mouvement.sens !== "ENCAISSEMENT" && mouvement.sens !== "DECAISSEMENT") continue;
        const acc = accumulateurs.get(mouvement.mode);
        if (acc === undefined) continue;
        if (mouvement.sens === "ENCAISSEMENT") {
            acc.enc = acc.enc.plus(toBig(mouvement.montant));
        } else {
            acc.dec = acc.dec.plus(toBig(mouvement.montant));
        }
    }

    for (const mode of MODES_REGLEMENT) {
        const acc = accumulateurs.get(mode);
        if (acc === undefined) continue;
        ventilation[mode] = {
            encaissements: arrondiTND(acc.enc),
            decaissements: arrondiTND(acc.dec),
            net: arrondiTND(acc.enc.minus(acc.dec)),
        };
    }
    return ventilation;
}

/* ─── Projection hebdomadaire ─────────────────────────────────────────────── */

export interface SemaineProjection {
    semaine: string;
    debut: Date;
    fin: Date;
    entrees: Big;
    sorties: Big;
    soldeEstime: Big;
}

const DUREE_JOUR_MS = 24 * 60 * 60 * 1000;
const DUREE_SEMAINE_MS = 7 * DUREE_JOUR_MS;

export interface ParametresProjection {
    soldeDepart: Big;
    /** Échéances PREVU (sens + dateEcheance porteurs). */
    mouvements: readonly MouvementTresorerieInput[];
    /** Jour de départ de la projection (généralement aujourd'hui). */
    debut: Date;
    /** Horizon en jours (30 à 365 dans l'UI). */
    jours: number;
}

/**
 * Projection hebdomadaire. Les échéances DÉJÀ EN RETARD (dateEcheance passée)
 * sont comptées dans la SEMAINE 1 — jamais perdues, jamais mélangées au solde.
 * Les écritures sans date d'échéance et les lignes hors horizon sont ignorées.
 */
export function projectionHebdomadaire(parametres: ParametresProjection): SemaineProjection[] {
    const nbSemaines = Math.max(1, Math.ceil(parametres.jours / 7));
    const semaines: Array<{ entrees: Big; sorties: Big }> = [];
    for (let index = 0; index < nbSemaines; index += 1) {
        semaines.push({ entrees: new Big(0), sorties: new Big(0) });
    }

    const finHorizon = parametres.debut.getTime() + parametres.jours * DUREE_JOUR_MS;

    for (const mouvement of parametres.mouvements) {
        if (mouvement.statut !== "PREVU") continue;
        const echeance = mouvement.dateEcheance ?? null;
        if (echeance === null) continue;
        const temps = echeance.getTime();
        if (temps >= finHorizon) continue;
        if (mouvement.sens !== "ENCAISSEMENT" && mouvement.sens !== "DECAISSEMENT") continue;
        const indexSemaine = temps < parametres.debut.getTime()
            ? 0
            : Math.floor((temps - parametres.debut.getTime()) / DUREE_SEMAINE_MS);
        const semaine = semaines[Math.min(indexSemaine, nbSemaines - 1)];
        if (mouvement.sens === "ENCAISSEMENT") {
            semaine.entrees = semaine.entrees.plus(toBig(mouvement.montant));
        } else {
            semaine.sorties = semaine.sorties.plus(toBig(mouvement.montant));
        }
    }

    const resultat: SemaineProjection[] = [];
    let cumul = parametres.soldeDepart;
    for (let index = 0; index < nbSemaines; index += 1) {
        const debutSemaine = new Date(parametres.debut.getTime() + index * DUREE_SEMAINE_MS);
        const finSemaine = new Date(debutSemaine.getTime() + DUREE_SEMAINE_MS);
        const entrees = arrondiTND(semaines[index].entrees);
        const sorties = arrondiTND(semaines[index].sorties);
        cumul = arrondiTND(cumul.plus(entrees).minus(sorties));
        resultat.push({
            semaine: `S${index + 1}`,
            debut: debutSemaine,
            fin: finSemaine,
            entrees,
            sorties,
            soldeEstime: cumul,
        });
    }
    return resultat;
}
