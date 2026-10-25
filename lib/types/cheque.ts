import type { ChequeType, ChequeStatus } from "./enums";
import type { SerializedTiers } from "./client";

export interface SerializedCheque {
    id: string;
    numero: string;
    banque: string;
    type: ChequeType;
    tiersId: string | null;
    invoiceId: string | null;
    beneficiaire: string;
    montant: string;
    dateEmission: Date;
    dateEcheance: Date;
    status: ChequeStatus;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    paymentId?: string | null;
    tiers?: SerializedTiers | null;
}
