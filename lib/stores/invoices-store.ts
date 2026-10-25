"use client";

import { create } from "zustand";
import type { InvoiceStatus } from "@/lib/types";

// ─── List Store ──────────────────────────────────────────────────────────────

interface InvoicesState {
    searchInput: string;
    searchQuery: string;
    statusFilter: InvoiceStatus | "ALL";
    setSearchInput: (q: string) => void;
    setSearchQuery: (q: string) => void;
    setStatusFilter: (s: InvoiceStatus | "ALL") => void;
    resetFilters: () => void;
}

export const useInvoicesStore = create<InvoicesState>((set) => ({
    searchInput: "",
    searchQuery: "",
    statusFilter: "ALL",
    setSearchInput: (q) => set({ searchInput: q }),
    setSearchQuery: (q) => set({ searchQuery: q }),
    setStatusFilter: (s) => set({ statusFilter: s }),
    resetFilters: () => set({ searchInput: "", searchQuery: "", statusFilter: "ALL" }),
}));

// ─── Invoice Form Store ──────────────────────────────────────────────────────

interface InvoiceLineForm {
    id: string;
    productId: string | null;
    variantId: string | null;
    description: string;
    quantite: string;
    prixHT: string;
    remise: string;
    tauxTVA: string;
    fodec: boolean;
    tauxFodec: string;
    totalHT: string;
}

interface InvoiceFormState {
    tiersId: string;
    dateEmission: string;
    dateEcheance: string;
    notes: string;
    lines: InvoiceLineForm[];
    // BC Visé
    bcViseActif: boolean;
    bcViseNumero: string;
    dateSN: string;
    poids: string;
    poidsBrut: string;
    nbColis: string;
    devise: string;
    tauxChange: string;
    montantTND: string;
    // Combobox search
    clientSearch: string;
    productSearch: string;

    setTiersId: (id: string) => void;
    setDateEmission: (d: string) => void;
    setDateEcheance: (d: string) => void;
    setNotes: (n: string) => void;
    setBcViseActif: (v: boolean) => void;
    setBcViseNumero: (v: string) => void;
    setDateSN: (v: string) => void;
    setPoids: (v: string) => void;
    setPoidsBrut: (v: string) => void;
    setNbColis: (v: string) => void;
    setDevise: (v: string) => void;
    setTauxChange: (v: string) => void;
    setMontantTND: (v: string) => void;
    setClientSearch: (v: string) => void;
    setProductSearch: (v: string) => void;

    addLine: () => void;
    removeLine: (id: string) => void;
    updateLine: (id: string, updates: Partial<InvoiceLineForm>) => void;
    resetForm: () => void;
}

const defaultLine = (): InvoiceLineForm => ({
    id: crypto.randomUUID(),
    productId: null,
    variantId: null,
    description: "",
    quantite: "1",
    prixHT: "0",
    remise: "0",
    tauxTVA: "19",
    fodec: false,
    tauxFodec: "1",
    totalHT: "0",
});

export const useInvoiceFormStore = create<InvoiceFormState>((set) => ({
    tiersId: "",
    dateEmission: new Date().toISOString().split("T")[0],
    dateEcheance: "",
    notes: "",
    lines: [defaultLine()],
    bcViseActif: false,
    bcViseNumero: "",
    dateSN: "",
    poids: "",
    poidsBrut: "",
    nbColis: "",
    devise: "TND",
    tauxChange: "",
    montantTND: "",
    clientSearch: "",
    productSearch: "",

    setTiersId: (id) => set({ tiersId: id, bcViseActif: false, bcViseNumero: "", dateSN: "", poids: "", poidsBrut: "", nbColis: "", tauxChange: "", montantTND: "" }),
    setDateEmission: (d) => set({ dateEmission: d }),
    setDateEcheance: (d) => set({ dateEcheance: d }),
    setNotes: (n) => set({ notes: n }),
    setBcViseActif: (v) => set({ bcViseActif: v }),
    setBcViseNumero: (v) => set({ bcViseNumero: v }),
    setDateSN: (v) => set({ dateSN: v }),
    setPoids: (v) => set({ poids: v }),
    setPoidsBrut: (v) => set({ poidsBrut: v }),
    setNbColis: (v) => set({ nbColis: v }),
    setDevise: (v) => set({ devise: v }),
    setTauxChange: (v) => set({ tauxChange: v }),
    setMontantTND: (v) => set({ montantTND: v }),
    setClientSearch: (v) => set({ clientSearch: v }),
    setProductSearch: (v) => set({ productSearch: v }),

    addLine: () =>
        set((s) => ({ lines: [...s.lines, defaultLine()] })),

    removeLine: (id) =>
        set((s) => ({
            lines: s.lines.filter((l) => l.id !== id),
        })),

    updateLine: (id, updates) =>
        set((s) => ({
            lines: s.lines.map((l) => (l.id === id ? { ...l, ...updates } : l)),
        })),

    resetForm: () =>
        set({
            tiersId: "",
            dateEmission: new Date().toISOString().split("T")[0],
            dateEcheance: "",
            notes: "",
            lines: [defaultLine()],
            bcViseActif: false,
            bcViseNumero: "",
            dateSN: "",
            poids: "",
            poidsBrut: "",
            nbColis: "",
            devise: "TND",
            tauxChange: "",
            montantTND: "",
            clientSearch: "",
            productSearch: "",
        }),
}));

// ─── Payment Form Store ──────────────────────────────────────────────────────

interface PaymentFormData {
    montant: string;
    methode: "ESPECES" | "VIREMENT" | "CARTE";
    reference: string;
    dateReglement: string;
    notes: string;
}

interface PaymentFormState {
    open: boolean;
    form: PaymentFormData;
    setOpen: (v: boolean, montant?: string) => void;
    setField: (field: keyof PaymentFormData, value: string) => void;
    reset: () => void;
}

const defaultPaymentForm = (): PaymentFormData => ({
    montant: "",
    methode: "VIREMENT",
    reference: "",
    dateReglement: new Date().toISOString().split("T")[0],
    notes: "",
});

export const usePaymentFormStore = create<PaymentFormState>((set) => ({
    open: false,
    form: defaultPaymentForm(),
    setOpen: (v, montant) => set({ open: v, ...(v && montant ? { form: { ...defaultPaymentForm(), montant } } : {}) }),
    setField: (field, value) =>
        set((s) => ({ form: { ...s.form, [field]: value as never } })),
    reset: () =>
        set({ open: false, form: defaultPaymentForm() }),
}));
