/**
 * Présentation pure de la trésorerie — lot D3.2.
 *
 * Aucun accès base, aucun React : fonctions de mapping lignes → colonnes/sens
 * consommées par l'écran Trésorerie (`components/paiements/*`) et testées par
 * vitest avec le jeu D2 (`lib/__tests__/tresorerie-presentation.test.ts`).
 *
 * Source des chiffres : `lib/types/tresorerie.ts` (réponse réelle de
 * `/api/tresorerie`) — ce module ne recalcule jamais le ledger, il arrange.
 */
import type {
    ModeReglementTresorerieAffiche,
    TresorerieRecents,
    TresorerieVentilationMode,
} from "@/lib/types/tresorerie";

/** Sens d'un mouvement, façon ledger (`lib/tresorerie/compute.ts`). */
export type SensMouvement = "ENCAISSEMENT" | "DECAISSEMENT";
/** Sens affiché : colonne / couleur / icône de la ligne. */
export type SensAffiche = "entree" | "sortie";
/** Statut ramené au trinôme affiché : prévu / réalisé / annulé. */
export type StatutFluxAffiche = "prevu" | "realise" | "annule";

export const MODES_TRESORERIE = ["ESPECES", "CHEQUE", "VIREMENT", "EFFET", "CARTE"] as const;

export function estModeReglement(value: string): value is ModeReglementTresorerieAffiche {
    return (MODES_TRESORERIE as readonly string[]).includes(value);
}

/** `source` de l'échéancier (bas de casse) → mode de règlement affichable. */
export function modeDepuisSource(source: string): ModeReglementTresorerieAffiche | null {
    if (source === "effet") return "EFFET";
    if (source === "cheque") return "CHEQUE";
    return estModeReglement(source.toUpperCase()) ? (source.toUpperCase() as ModeReglementTresorerieAffiche) : null;
}

const STATUTS_REALISES = new Set(["REALISE", "CONFIRME", "ENCAISSE", "PAYE", "PAYEE", "VALIDEE"]);
const STATUTS_ANNULES = new Set(["ANNULE", "ANNULEE", "REJETE", "REMBOURSE"]);

/** Ramène n'importe quel statut métier au trinôme prévu / réalisé / annulé. */
export function statutFluxAffiche(status: string): StatutFluxAffiche {
    const cle = status.trim().toUpperCase();
    if (STATUTS_ANNULES.has(cle)) return "annule";
    if (STATUTS_REALISES.has(cle)) return "realise";
    return "prevu";
}

export interface SourceLigne {
    sens: SensMouvement;
    mode: ModeReglementTresorerieAffiche;
    montant: string | number;
}

export interface LigneMouvementVue {
    /** Colonne du tableau (mode de règlement). */
    colonne: ModeReglementTresorerieAffiche;
    sens: SensAffiche;
    signe: "+" | "−";
    montant: number;
    montantSigne: number;
}

export interface CaseMode {
    entrees: number;
    sorties: number;
    net: number;
}

export interface TableauFlux {
    cases: Record<ModeReglementTresorerieAffiche, CaseMode>;
    totalEntrees: number;
    totalSorties: number;
    /** Solde = entrées − sorties (signé, jamais la couleur seule porte le sens). */
    solde: number;
}

export interface TableauAvecLignes extends TableauFlux {
    lignes: LigneMouvementVue[];
}

const arrondiTND = (valeur: number): number => Math.round(valeur * 1000) / 1000;

const enNombre = (valeur: string | number): number => {
    if (typeof valeur === "number") return Number.isFinite(valeur) ? valeur : 0;
    const parsed = Number.parseFloat(valeur);
    return Number.isFinite(parsed) ? parsed : 0;
};

function caseVide(): CaseMode {
    return { entrees: 0, sorties: 0, net: 0 };
}

function tableauVide(): Record<ModeReglementTresorerieAffiche, CaseMode> {
    return {
        ESPECES: caseVide(),
        CHEQUE: caseVide(),
        VIREMENT: caseVide(),
        EFFET: caseVide(),
        CARTE: caseVide(),
    };
}

/** Mapping d'une ligne → colonne + sens + signe (le cœur testé en D2). */
export function presenterLigne(source: SourceLigne): LigneMouvementVue {
    const montant = arrondiTND(Math.abs(enNombre(source.montant)));
    const entree = source.sens === "ENCAISSEMENT";
    return {
        colonne: source.mode,
        sens: entree ? "entree" : "sortie",
        signe: entree ? "+" : "−",
        montant,
        montantSigne: entree ? montant : -montant,
    };
}

/** Tableau complet (colonnes = modes, totaux = entrées/sorties/solde) depuis des lignes. */
export function presenterLignes(lignes: readonly SourceLigne[]): TableauAvecLignes {
    const cases = tableauVide();
    const vues: LigneMouvementVue[] = [];
    let totalEntrees = 0;
    let totalSorties = 0;

    for (const source of lignes) {
        const vue = presenterLigne(source);
        const c = cases[vue.colonne];
        if (vue.sens === "entree") {
            c.entrees = arrondiTND(c.entrees + vue.montant);
            totalEntrees = arrondiTND(totalEntrees + vue.montant);
        } else {
            c.sorties = arrondiTND(c.sorties + vue.montant);
            totalSorties = arrondiTND(totalSorties + vue.montant);
        }
        vues.push(vue);
    }

    for (const mode of MODES_TRESORERIE) {
        cases[mode].net = arrondiTND(cases[mode].entrees - cases[mode].sorties);
    }

    return {
        cases,
        totalEntrees,
        totalSorties,
        solde: arrondiTND(totalEntrees - totalSorties),
        lignes: vues,
    };
}

/** Carte « Entrées / Sorties du mois » à partir de l'agrégat API `ventilationMois`. */
export function presenterVentilationMois(
    ventilation: Readonly<Partial<Record<ModeReglementTresorerieAffiche, Pick<TresorerieVentilationMode, "encaissements" | "decaissements" | "net">>>>,
): TableauFlux {
    const lignes: SourceLigne[] = [];
    for (const mode of MODES_TRESORERIE) {
        const c = ventilation[mode];
        if (!c) continue;
        lignes.push({ sens: "ENCAISSEMENT", mode, montant: c.encaissements });
        lignes.push({ sens: "DECAISSEMENT", mode, montant: c.decaissements });
    }
    const { cases, totalEntrees, totalSorties, solde } = presenterLignes(lignes);
    return { cases, totalEntrees, totalSorties, solde };
}

export interface LigneRecenteVue extends LigneMouvementVue {
    id: string;
    date: string;
    tiers: string;
    reference: string | null;
    mode: ModeReglementTresorerieAffiche;
    statut: StatutFluxAffiche;
    statutSource: string;
}

export interface RecentsVue {
    lignes: LigneRecenteVue[];
    tableau: TableauFlux;
}

interface SourceRecente {
    id: string;
    date: string;
    tiers: string;
    reference: string | null;
    statutSource: string;
    numeroInstrument: string | null;
    source: SourceLigne;
}

function modeOuDefaut(value: string): ModeReglementTresorerieAffiche | null {
    return estModeReglement(value.toUpperCase()) ? (value.toUpperCase() as ModeReglementTresorerieAffiche) : null;
}

/**
 * Fusionne les listes de `recents` en une seule table chronologique, en
 * supprimant les doublons instrument/paiement (un chèque ou un effet déjà
 * représenté par un règlement `chequeNumero`/`effetNumero` n'apparaît qu'une fois).
 */
export function presenterRecents(recents: TresorerieRecents): RecentsVue {
    const reglements = recents.paiements;
    const instruments = new Set(
        reglements.flatMap((p) => [p.chequeNumero, p.effetNumero]).filter((n): n is string => Boolean(n)),
    );

    const collectes: SourceRecente[] = [];

    for (const p of reglements) {
        const mode = modeOuDefaut(p.methode);
        if (!mode) continue;
        collectes.push({
            id: p.id,
            date: p.date,
            tiers: p.client,
            reference: p.reference,
            statutSource: p.status,
            numeroInstrument: p.chequeNumero ?? p.effetNumero,
            source: { sens: p.flux === "sortie" ? "DECAISSEMENT" : "ENCAISSEMENT", mode, montant: p.montant },
        });
    }

    for (const e of recents.effets) {
        if (instruments.has(e.numero)) continue;
        collectes.push({
            id: `effet-${e.id}`,
            date: e.date,
            tiers: e.contrepartie,
            reference: e.numero,
            statutSource: e.status,
            numeroInstrument: e.numero,
            source: { sens: e.type === "RECU" ? "ENCAISSEMENT" : "DECAISSEMENT", mode: "EFFET", montant: e.montant },
        });
    }

    for (const c of recents.cheques) {
        if (instruments.has(c.numero)) continue;
        collectes.push({
            id: `cheque-${c.id}`,
            date: c.date,
            tiers: c.beneficiaire,
            reference: c.numero,
            statutSource: c.status,
            numeroInstrument: c.numero,
            source: { sens: c.type === "RECU" ? "ENCAISSEMENT" : "DECAISSEMENT", mode: "CHEQUE", montant: c.montant },
        });
    }

    collectes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const tableau = presenterLignes(collectes.map((c) => c.source));
    const lignes: LigneRecenteVue[] = collectes.map((c) => {
        const vue = presenterLigne(c.source);
        return {
            ...vue,
            id: c.id,
            date: c.date,
            tiers: c.tiers,
            reference: c.reference,
            mode: vue.colonne,
            statut: statutFluxAffiche(c.statutSource),
            statutSource: c.statutSource,
        };
    });

    return { lignes, tableau: { cases: tableau.cases, totalEntrees: tableau.totalEntrees, totalSorties: tableau.totalSorties, solde: tableau.solde } };
}
