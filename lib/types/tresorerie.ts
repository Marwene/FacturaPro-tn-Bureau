/**
 * Types partagés de l'écran Trésorerie — lot D2.
 *
 * SOURCE UNIQUE de vérité pour la forme de la réponse de `/api/tresorerie`
 * (et de son évolution) : le hook `hooks/use-tresorerie.ts` et le composant
 * `components/paiements/tresorerie-client.tsx` importent d'ici au lieu de
 * dupliquer l'interface (dérive historique corrigée en D2).
 */

/** Modes de règlement affichés — aligné sur `lib/tresorerie/compute.ts`. */
export type ModeReglementTresorerieAffiche =
    | "ESPECES"
    | "CHEQUE"
    | "VIREMENT"
    | "EFFET"
    | "CARTE";

export interface TresorerieSolde {
    /** Solde réalisé (grand livre, contre-passations exclues) — format "600.000". */
    actuel: string;
    /** Encours à recevoir (écritures PREVU d'encaissement). */
    aRecevoir: string;
    /** Encours à payer (écritures PREVU de décaissement). */
    aPayer: string;
    /** Total des échéances PREVU déjà passées — totalisé À PART. */
    enRetard: string;
    /** soldeReel + aRecevoir − aPayer. */
    previsionnel: string;
    /** Encaissements réalisés depuis le début du mois. */
    entreesMois: string;
    /** Décaissements réalisés depuis le début du mois. */
    sortiesMois: string;
    especesMois: string;
    virementsMois: string;
    cartesMois: string;
    chequesMois: string;
    /** Solde estimé à l'horizon (fin de dernière semaine de projection). */
    projectionHorizon: string;
}

export interface TresorerieEcheancierLigne {
    date: string;
    flux: "entree" | "sortie";
    source: "effet" | "cheque" | "especes" | "virement" | "carte" | "realise";
    montant: number;
    numero: string;
    contrepartie: string;
    status: string;
    id: string;
    type?: string;
    ordrePaiementNumero?: string;
    paymentId?: string | null;
    chequeId?: string | null;
    effetId?: string | null;
    instrumentType?: "CHEQUE" | "EFFET";
}

export interface TresorerieProjectionSemaine {
    semaine: string;
    debut: string;
    entree: number;
    sortie: number;
    soldeEstime: number;
}

/** Ventilation REALISE du mois courant par mode de règlement (format "12.345"). */
export interface TresorerieVentilationMode {
    encaissements: string;
    decaissements: string;
    net: string;
}

export interface TresorerieCompte {
    id: string;
    type: "CAISSE" | "BANQUE";
    libelle: string;
    soldeInitial: string;
    dateSoldeInitial: string;
    /** Solde réalisé du compte (fenêtre dateSoldeInitial incluse). */
    solde: string;
}

export interface TresorerieRecents {
    paiements: Array<{
        id: string;
        montant: number;
        date: string;
        methode: string;
        reference: string | null;
        status: string;
        client: string;
        flux: string;
        chequeNumero: string | null;
        effetNumero: string | null;
    }>;
    especes: Array<{ id: string; montant: number; date: string; reference: string | null; status: string; client: string }>;
    virements: Array<{ id: string; montant: number; date: string; reference: string | null; status: string; client: string }>;
    cartes: Array<{ id: string; montant: number; date: string; reference: string | null; status: string; client: string }>;
    effets: Array<{ id: string; montant: number; date: string; numero: string; type: string; status: string; contrepartie: string }>;
    cheques: Array<{ id: string; montant: number; date: string; numero: string; type: string; status: string; beneficiaire: string }>;
    pendingCheques: Array<{ id: string; montant: number; date: string; numero: string; type: string; beneficiaire: string; client: string | null }>;
    counts: { paiements: number; especes: number; virements: number; cartes: number; effets: number; cheques: number };
}

export interface TresorerieData {
    solde: TresorerieSolde;
    echeancier: TresorerieEcheancierLigne[];
    projection: TresorerieProjectionSemaine[];
    /** Ventilation par mode de règlement ET par sens sur le mois courant. */
    ventilationMois: Record<ModeReglementTresorerieAffiche, TresorerieVentilationMode>;
    /** Solde réalisé ventilé par compte (CAISSE / BANQUE). */
    parCompte: TresorerieCompte[];
    recents: TresorerieRecents;
}

/** Une ligne mensuelle du graphe d'évolution (`/api/tresorerie/evolution`). */
export interface EvolutionMonth {
    mois: string;
    label: string;
    especes: number;
    virements: number;
    cheques: number;
    effets: number;
    cartes: number;
    /** Encaissements réalisés du mois (tous modes confondus). */
    entrees: number;
    /** Décaissements réalisés du mois (tous modes confondus). */
    sorties: number;
}

export interface TresorerieEvolutionData {
    months: EvolutionMonth[];
}
