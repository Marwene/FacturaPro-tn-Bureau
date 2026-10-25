import type { EffetStatus, EffetType } from "./enums";
import type { SerializedTiers } from "./client";

export interface SerializedCompanyBankAccount {
    id: string;
    companyId: string;
    nomBanque: string;
    rib: string | null;
    agence: string | null;
    isDefault: boolean;
    actif: boolean;
}

export interface SerializedEffetAchat {
    id: string;
    effetId: string;
    achatId: string;
    montantAlloue: string;
    achat?: { id: string; numero: string; totalTTC: string } | null;
}

export interface SerializedEffet {
    id: string;
    numero: string;
    type: EffetType;
    invoiceId: string | null;
    montant: string;
    tire: string;
    tireAdresse: string | null;
    tireBanque: string | null;
    beneficiaire: string;
    tireurId: string | null;
    fournisseurId: string | null;
    dateCreation: Date;
    dateEcheance: Date;
    dateRemise: Date | null;
    endosseLe: Date | null;
    dateImpaye: Date | null;
    status: EffetStatus;
    tauxEscompte: string | null;
    frais: string | null;
    netEncaisse: string | null;
    endosseA: string | null;
    motifImpaye: string | null;
    fraisProtet: string | null;
    rappel15jEnvoye: boolean;
    rappel10jEnvoye: boolean;
    rappel5jEnvoye: boolean;
    rappelJourEnvoye: boolean;
    splitGroup: string | null;
    splitIndex: number | null;
    splitTotal: number | null;
    notes: string | null;
    ordrePaiementNumero: string | null;
    companyId: string | null;
    companyBankAccountId: string | null;
    createdAt: Date;
    updatedAt: Date;
    tireur?: SerializedTiers | null;
    fournisseur?: SerializedTiers | null;
    invoice?: { id: string; numero: string; totalTTC: string } | null;
    companyBank?: SerializedCompanyBankAccount | null;
    achatsLies?: SerializedEffetAchat[];
}
