import type { PaymentMethod } from "./enums";
import type { SerializedTiers } from "./client";
import type { SerializedInvoice } from "./invoice";

export interface SerializedPaymentEffet {
    id: string;
    numero: string;
    status: string;
    dateEcheance: Date | null;
}

export interface SerializedPaymentCheque {
    id: string;
    numero: string;
    status: string;
    dateEcheance: Date | null;
}

export interface SerializedPayment {
    id: string;
    invoiceId: string | null;
    achatId: string | null;
    tiersId: string;
    montant: string;
    methode: PaymentMethod;
    status: string;
    reference: string | null;
    dateReglement: Date;
    notes: string | null;
    createdAt: Date;
    tiers?: SerializedTiers;
    invoice?: SerializedInvoice;
    effet?: SerializedPaymentEffet;
    cheque?: SerializedPaymentCheque;
}
