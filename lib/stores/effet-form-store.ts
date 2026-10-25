"use client";

import { create } from "zustand";

export interface EffetFormData {
    type: "RECU" | "EMIS"
    montant: string
    tire: string
    tireAdresse: string
    tireBanque: string
    beneficiaire: string
    tireurId: string
    fournisseurId: string
    companyBankAccountId: string
    invoiceId: string
    dateCreation: string
    dateEcheance: string
    ordrePaiementNumero: string
    notes: string
    achatsLies: { achatId: string; montantAlloue: string }[]
}

const defaultEffetForm: EffetFormData = {
    type: "RECU", montant: "", tire: "", tireAdresse: "", tireBanque: "", beneficiaire: "",
    tireurId: "", fournisseurId: "", companyBankAccountId: "", invoiceId: "",
    dateCreation: new Date().toISOString().split("T")[0], dateEcheance: "", ordrePaiementNumero: "", notes: "", achatsLies: [],
}

const freshForm = (): EffetFormData => ({ ...defaultEffetForm, achatsLies: [] })

interface EffetFormState {
    form: EffetFormData;
    updateForm: (updates: Partial<EffetFormData>) => void;
    resetForm: () => void;
}

export const useEffetFormStore = create<EffetFormState>((set) => ({
    form: freshForm(),
    updateForm: (updates) => set((state) => ({ form: { ...state.form, ...updates } })),
    resetForm: () => set({ form: freshForm() }),
}));
