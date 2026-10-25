export interface SerializedTiers {
    id: string;
    code: string;
    raisonSociale: string;
    matriculeFiscal: string | null;
    adresse: string | null;
    ville: string | null;
    codePostal: string | null;
    telephone: string | null;
    email: string | null;
    siteWeb: string | null;
    assujettTVA: boolean;
    exonereTVA: boolean;
    tauxRetenue: string;
    creditLimit: string;
    ribBancaire: string | null;
    banque: string | null;
    notes: string | null;
    actif: boolean;
    devise: string;
    deviseSecondaire: string | null;
    dateBlocage: Date | null;
    emailSentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    isClient: boolean;
    isFournisseur: boolean;
    contactNom: string | null;
    contactTel: string | null;
    contactFonction: string | null;
    solde?: string;
    totalFactures?: number;
}

export interface TiersDetailStats {
    totalCA: string;
    totalPaye: string;
    totalImpaye: string;
    nbFactures: number;
    nbImpayees: number;
}

export interface TiersDocument {
    id: string;
    type: "devis" | "bon-commande" | "bon-livraison" | "facture" | "avoir";
    numero: string;
    date: Date;
    totalTTC: string;
    status: string;
}

export interface TiersSoldeEntry {
    id: string;
    date: Date;
    piece: string;
    mouvement: string;
    commentaire: string;
    debit: string;
    credit: string;
    solde: string;
}

export interface TiersSoldeResponse {
    entries: TiersSoldeEntry[];
    totalDebit: string;
    totalCredit: string;
    soldeFinal: string;
}

export interface TiersBlocageInfo {
    estBloque: boolean;
    dateBlocage: Date | null;
    creditLimit: string;
    soldeImpaye: string;
    tauxUtilisation: number;
    emailSentAt: Date | null;
}

export interface TiersDocumentSummary {
    id: string;
    numero: string;
    dateCreation?: Date;
    dateEmission?: Date;
    totalTTC: string;
    status: string;
}

export interface TiersDocumentsResponse {
    devis: TiersDocumentSummary[];
    bonsCommandes: TiersDocumentSummary[];
    bonsLivraison: TiersDocumentSummary[];
    factures: TiersDocumentSummary[];
    avoirs: TiersDocumentSummary[];
}
